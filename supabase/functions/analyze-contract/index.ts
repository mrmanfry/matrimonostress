import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();
    console.log("[analyze-contract] Starting OCR analysis for:", fileUrl);

    if (!fileUrl) {
      console.error("[analyze-contract] Missing fileUrl");
      return new Response(
        JSON.stringify({ error: "fileUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get required environment variables
    const GOOGLE_CLOUD_VISION_CREDENTIALS = Deno.env.get("GOOGLE_CLOUD_VISION_CREDENTIALS");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_CLOUD_VISION_CREDENTIALS) {
      console.error("[analyze-contract] GOOGLE_CLOUD_VISION_CREDENTIALS not configured");
      return new Response(
        JSON.stringify({ error: "Google Cloud Vision API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[analyze-contract] Missing required credentials");
      return new Response(
        JSON.stringify({ error: "Backend configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse Google Cloud credentials (Service Account JSON)
    const credentials = JSON.parse(GOOGLE_CLOUD_VISION_CREDENTIALS);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file from Supabase Storage
    console.log("[analyze-contract] Downloading file from storage");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("vendor-contracts")
      .download(fileUrl);

    if (downloadError || !fileData) {
      console.error("[analyze-contract] Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper function to convert ArrayBuffer to base64 in chunks (prevents stack overflow)
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192; // Process 8KB at a time
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      return btoa(binary);
    };

    // Convert blob to base64 for Google Cloud Vision API
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = arrayBufferToBase64(arrayBuffer);

    // Generate OAuth2 access token from Service Account
    console.log("[analyze-contract] Generating OAuth2 access token");
    
    // Helper function to convert base64 to base64url
    const base64ToBase64Url = (base64: string) => {
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = {
      alg: "RS256",
      typ: "JWT",
    };
    const jwtClaimSet = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-vision",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Encode JWT parts using base64url
    const encodedHeader = base64ToBase64Url(btoa(JSON.stringify(jwtHeader)));
    const encodedClaimSet = base64ToBase64Url(btoa(JSON.stringify(jwtClaimSet)));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

    // Import private key and sign
    const privateKey = credentials.private_key;
    
    // Remove PEM header/footer and decode base64
    const pemContents = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\\n/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '');
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const keyData = await crypto.subtle.importKey(
      "pkcs8",
      bytes.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyData,
      new TextEncoder().encode(signatureInput)
    );
    const encodedSignature = base64ToBase64Url(arrayBufferToBase64(signature));
    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[analyze-contract] OAuth2 token error:", tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Google Cloud" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Call Google Cloud Vision API for OCR
    console.log("[analyze-contract] Calling Google Cloud Vision API for OCR");
    const visionResponse = await fetch(
      "https://vision.googleapis.com/v1/images:annotate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64File,
              },
              features: [
                {
                  type: "DOCUMENT_TEXT_DETECTION",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("[analyze-contract] Google Cloud Vision API error:", visionResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "OCR extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const visionData = await visionResponse.json();
    console.log("[analyze-contract] OCR completed");

    // Extract full text from OCR response
    const fullTextAnnotation = visionData.responses?.[0]?.fullTextAnnotation;
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      console.error("[analyze-contract] No text found in document");
      return new Response(
        JSON.stringify({ error: "No text found in document. Please upload a clearer file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Split text into lines
    const fullText = fullTextAnnotation.text.split('\n').filter((line: string) => line.trim() !== '');
    console.log(`[analyze-contract] Extracted ${fullText.length} lines of text`);

    // Now use Lovable AI to classify sections
    console.log("[analyze-contract] Calling Lovable AI to classify sections");
    
    const classifierPrompt = `Sei un classificatore di sezioni di contratti. Il tuo compito è IDENTIFICARE dove si trovano le seguenti sezioni nel testo fornito.

SEZIONI DA IDENTIFICARE:
1. vendor_info: Informazioni sul fornitore (ragione sociale, P.IVA, indirizzo, contatti, IBAN)
2. payment_plan: Piano di pagamento con rate, importi e scadenze
3. cancellation: Clausole di cancellazione e penali
4. extra_costs: Costi extra o non inclusi nel contratto
5. force_majeure: Clausole su maltempo, forza maggiore, Piano B
6. client_responsibilities: Responsabilità del cliente

REGOLE CRITICHE:
- NON ESTRARRE I DATI, SOLO IDENTIFICARE DOVE SI TROVANO
- Per ogni sezione, indica: start_line (numero riga inizio), end_line (numero riga fine), confidence (0-1)
- Se una sezione NON È PRESENTE, NON includerla nell'output
- Se non sei sicuro (confidence < 0.6), NON includere la sezione

OUTPUT RICHIESTO - JSON con array "sections":
[
  {
    "type": "vendor_info",
    "start_line": 5,
    "end_line": 12,
    "confidence": 0.95
  },
  ...
]

TESTO DEL CONTRATTO (${fullText.length} righe):
${fullText.map((line: string, i: number) => `${i + 1}: ${line}`).join('\n')}

Restituisci SOLO JSON, nessun commento.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: classifierPrompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[analyze-contract] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite di richieste superato. Riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti insufficienti. Aggiungi fondi al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Errore durante la classificazione delle sezioni." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("[analyze-contract] AI classification completed");

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error("[analyze-contract] No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON from response
    let jsonContent = aiContent.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let sections;
    try {
      sections = JSON.parse(jsonContent);
      console.log(`[analyze-contract] Classified ${sections.length} sections`);
    } catch (parseError) {
      console.error("[analyze-contract] Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI classification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the result
    const result = {
      full_text: fullText,
      sections: sections,
    };

    console.log("[analyze-contract] Analysis successful");
    return new Response(
      JSON.stringify({ analysis: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[analyze-contract] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
