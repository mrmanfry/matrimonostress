import { Page, View, Text, Image } from '@react-pdf/renderer';
import { createStyles } from './pdfStyles';
import type { MassBookletStyle } from '@/lib/massBookletSchema';

interface Props {
  partner1: string;
  partner2: string;
  dateText: string;
  churchName: string;
  style?: MassBookletStyle;
}

export default function PdfCoverPage({ partner1, partner2, dateText, churchName, style }: Props) {
  const s = createStyles(style);
  const layout = style?.cover_layout || 'text_only';
  const imageUrl = style?.cover_image_url;
  const imageHeight = style?.cover_image_height || 200;

  const textBlock = (
    <>
      <Text style={s.coverCross}>✝</Text>
      <Text style={s.coverTitle}>{partner1 || '...'}</Text>
      <Text style={s.coverAmpersand}>&amp;</Text>
      <Text style={s.coverTitle}>{partner2 || '...'}</Text>
      <View style={s.coverLine} />
      <Text style={s.coverDate}>{dateText}</Text>
      {churchName ? <Text style={s.coverChurch}>{churchName}</Text> : null}
    </>
  );

  if (layout === 'image_background' && imageUrl) {
    return (
      <Page size={[420.94, 595.28]} style={s.coverPage}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Image src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' as any }} />
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 56 }}>
          {textBlock}
        </View>
      </Page>
    );
  }

  if (layout === 'image_top' && imageUrl) {
    return (
      <Page size={[420.94, 595.28]} style={{ ...s.coverPage, justifyContent: 'flex-start', paddingTop: 0 }}>
        <Image src={imageUrl} style={{ width: '100%', height: imageHeight, objectFit: 'cover' as any }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 56 }}>
          {textBlock}
        </View>
      </Page>
    );
  }

  if (layout === 'image_bottom' && imageUrl) {
    return (
      <Page size={[420.94, 595.28]} style={{ ...s.coverPage, justifyContent: 'flex-start' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {textBlock}
        </View>
        <Image src={imageUrl} style={{ width: '100%', height: imageHeight, objectFit: 'cover' as any, marginTop: 'auto' }} />
      </Page>
    );
  }

  // text_only (default)
  return (
    <Page size={[420.94, 595.28]} style={s.coverPage}>
      {textBlock}
    </Page>
  );
}
