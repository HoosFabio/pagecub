import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — PageCub",
  description: "PageCub privacy policy.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell py-24 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-sage mb-3">Legal</p>
        <h1 className="display text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-ink/50 text-sm mb-12">Last Updated: April 27, 2026</p>

        <div className="space-y-10 text-sm leading-7 text-ink/75">
          <p>This Privacy Policy explains how PageCub, an InkSynth product ("PageCub," "we," "us," or "our"), collects, uses, and protects personal information when you use our book creation service at pagecub.com.</p>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">1. Information We Collect</h2>
            <p className="mb-3">We collect only what we need to create your book and deliver it to you:</p>
            <ul className="list-disc pl-5 space-y-1">
              {[
                "Your email address (to deliver your book and send order confirmation)",
                "Details about the child featured in the book — name, age, appearance, personality, and story preferences — as you provide them in the creation form",
                "Payment information processed by Stripe (we never see or store your card number)",
                "Basic usage data such as page visits and browser type, collected automatically",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">2. We Do Not Sell Your Data</h2>
            <p>PageCub does not sell, rent, broker, or trade your personal information or your child's information to any third party — ever. Your details exist for one purpose: to create your book.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              {[
                "To generate your personalized illustrated storybook",
                "To deliver your book PDF by email",
                "To send your order confirmation and status updates",
                "To process your payment through Stripe",
                "To respond to support inquiries",
                "To improve the PageCub service",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">4. How We Share Information</h2>
            <p className="mb-3">We share information only as necessary to operate the service:</p>
            <ul className="list-disc pl-5 space-y-1">
              {[
                "With Stripe to process payments securely",
                "With our email delivery provider (MailerSend) to send your book and confirmation",
                "With the automated creative tools that generate your story and illustrations",
                "With hosting and infrastructure providers who operate our systems",
                "When required by law",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="mt-3">We do not share your information with advertisers or marketing partners.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">5. Your Child's Information</h2>
            <p>Details you provide about your child — name, appearance, personality — are used solely to create the book you ordered. We do not build profiles on children, share their details with third parties, or use them for advertising. PageCub is intended to be used by parents and guardians, not directly by children.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">6. Data Retention</h2>
            <p>We retain your order information and book content long enough to support delivery, troubleshoot issues, and maintain billing records. If you would like your data deleted, contact us at support@pagecub.com and we will honor that request.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">7. Security</h2>
            <p>We use reasonable technical and organizational safeguards to protect your information. Payments are handled entirely by Stripe and are never stored on PageCub systems.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">8. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal information at any time by contacting us at support@pagecub.com.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Continued use of PageCub after updates constitutes acceptance of the revised Policy.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-ink mb-2">10. Contact</h2>
            <p className="mb-4">Questions about privacy? Reach us at:</p>
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
