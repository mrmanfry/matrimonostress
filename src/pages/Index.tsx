import Hero from "@/components/Hero";
import ValueProposition from "@/components/ValueProposition";
import ProblemStatement from "@/components/ProblemStatement";
import TargetAudience from "@/components/TargetAudience";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <ValueProposition />
      <ProblemStatement />
      <TargetAudience />
      <Footer />
    </div>
  );
};

export default Index;
