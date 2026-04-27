import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — PageCub",
  description: "PageCub terms of service.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell py-24 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-sage mb-3">Legal</p>
        <h1 className="display text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-ink/50 text-sm mb-12">Last Updated: April 27, 2026</p>

        <div className="space-y-10 text-sm leading-7 text-ink/75">
          <p>These Terms of Service ("Terms") govern your access to and use of the websites, services, and book creation tools provided by PageCub, an InkSynth product ("PageCub," "we," "us," or "our"). By using PageCub, you agree to these Terms.</p>

          {[
            ["1. Eligibility", "You must be at least 18 years old to use PageCub. By submitting a book creation request, you confirm that you are the parent or legal guardian of the child featured in the book, or that you have explicit permission from the child's parent or guardian to do so."],
            ["2. What PageCub Does", "PageCub uses automated creative tools to generate personalized illustrated storybooks based on the details you provide. The finished book is delivered digitally as a PDF. Print fulfillment is coming soon and will be offered as a separate option when available."],
            ["3. Your Inputs", "You are solely responsible for the information you submit — including your child's name, description, personality, and other details. You represent that all information you provide is accurate, that you have the right to submit it, and that it does not infringe on any third party's rights. Do not submit sensitive personal data beyond what is needed to create the book."],
            ["4. Book Ownership", "Once your book is generated and delivered, you own the finished PDF for personal, non-commercial use. You may print it, share it with family, or keep it for your own use. You may not resell, sublicense, or distribute it commercially."],
            ["5. Payments and Refunds", "Payment is required before book generation begins. Payments are processed securely by Stripe. Because book generation starts immediately upon payment confirmation and involves significant creative processing, all sales are final once generation has started. If your book fails to generate due to a technical error on our end, we will issue a full refund or regenerate your book at no charge."],
            ["6. No Data Selling", "We do not sell, rent, broker, or trade your personal information or your child's information to any third party. Your details are used only to create your book. See our Privacy Policy for full details."],
            ["7. Disclaimers", "PageCub is provided as-is. Generated stories and illustrations are creative outputs — they may not perfectly match every detail you describe. We do not guarantee any specific artistic result. Generated content is not professional psychological, medical, or therapeutic advice."],
            ["8. Limitation of Liability", "To the maximum extent permitted by law, PageCub's total liability for any claim arising from your use of the service is limited to the amount you paid for the relevant order."],
            ["9. Children's Data", "PageCub is designed to be used by parents and guardians on behalf of children. We do not knowingly collect personal information directly from children under 13. Personal details about your child that you submit are used solely to generate your book and are not shared or sold. See our Privacy Policy for retention and deletion details."],
            ["10. Changes to These Terms", "We may update these Terms from time to time. Continued use of PageCub after updates constitutes acceptance of the revised Terms."],
          ].map(([title, body]) => (
            <div key={title as string}>
              <h2 className="text-base font-bold text-ink mb-2">{title}</h2>
              <p>{body}</p>
            </div>
          ))}

          <div>
            <h2 className="text-base font-bold text-ink mb-2">11. Contact</h2>
            <p className="mb-4">Questions about these Terms? Reach us at:</p>
            <div className="rounded-2xl border border-line bg-card p-6 space-y-1">
              <p className="font-bold">PageCub / InkSynth</p>
              <p>10220 Old Leo Rd Unit #2027, Fort Wayne, IN 46825</p>
              <p>support@pagecub.com</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
