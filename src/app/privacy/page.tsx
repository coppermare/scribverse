import type { Metadata } from 'next';
import Link from 'next/link';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://scribverse.xyz';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How scribverse handles your data.',
  alternates: { canonical: `${siteUrl}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 26, 2026</p>

        <div className="mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">What scribverse is</h2>
            <p className="text-muted-foreground">
              scribverse is a free, stateless utility at{' '}
              <Link href="/" className="text-primary underline underline-offset-2">
                scribverse.xyz
              </Link>{' '}
              that fetches transcripts from supported video links (YouTube, TikTok, Instagram,
              X, and Facebook) and returns the text to your browser so you can copy or download
              it. No account is required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">
              What we receive when you use the tool
            </h2>
            <p className="text-muted-foreground">
              When you submit a video URL, our servers receive that URL together with standard HTTP
              request data — your IP address and browser user-agent string. We use this to validate
              the request, apply per-IP abuse limits, and retrieve transcripts and metadata from
              video platforms (directly for YouTube where possible, or via our transcription
              provider for other sources), then return the result to your browser.
            </p>
            <p className="text-muted-foreground">
              We do not store the URL or the transcript on our servers after the response is sent.
              IP addresses are held in short-lived server memory for rate limiting only; they are
              not written to a database and are lost when the server process restarts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Local storage
            </h2>
            <p className="text-muted-foreground">
              The site stores one value in your browser&apos;s local storage: your dark or light
              theme preference. No cookies are set by scribverse for tracking or advertising
              purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">
              What we do not do
            </h2>
            <p className="text-muted-foreground">
              We do not sell or share your data with third parties beyond what is required to
              operate the service. We do not run advertising or behavioural tracking. We do not use
              this service to train generative AI models. We do not store user accounts or
              transcript histories.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">Third parties</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Vercel</strong> — the site is
                hosted on Vercel, which collects standard infrastructure logs (IP address, request
                path, timestamps) subject to their{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  privacy policy
                </a>
                .
              </li>
              <li>
                <strong className="font-medium text-foreground">YouTube / Google</strong> — for
                YouTube links, metadata and captions are fetched from Google&apos;s APIs and public
                endpoints where possible, subject to Google&apos;s{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  privacy policy
                </a>
                .
              </li>
              <li>
                <strong className="font-medium text-foreground">Supadata</strong> — for some
                YouTube requests (when direct caption fetch fails) and for TikTok, Instagram, X, and
                Facebook links, we send the video URL to{' '}
                <a
                  href="https://supadata.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Supadata
                </a>{' '}
                to retrieve transcripts and metadata. That processing is subject to{' '}
                <a
                  href="https://supadata.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Supadata&apos;s privacy policy
                </a>
                . Depending on the video, Supadata may return existing platform captions or produce a
                transcript with automated speech recognition (see their documentation for details).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-foreground">Contact</h2>
            <p className="text-muted-foreground">
              For privacy questions or corrections, open an issue or reach out via the{' '}
              <a
                href="https://github.com/coppermare"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                project repository
              </a>
              .
            </p>
          </section>
        </div>
    </div>
  );
}
