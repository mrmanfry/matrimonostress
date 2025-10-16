import Hero from "@/components/Hero";
import ValueProposition from "@/components/ValueProposition";
import ProblemStatement from "@/components/ProblemStatement";
import TargetAudience from "@/components/TargetAudience";
import HowItWorks from "@/components/HowItWorks";
import TechStack from "@/components/TechStack";
import DeviceSupport from "@/components/DeviceSupport";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <ValueProposition />
      <ProblemStatement />
      <TargetAudience />
      <HowItWorks />
      <TechStack />
      <DeviceSupport />
      <Footer />
    </div>
  );
};

export default Index;
