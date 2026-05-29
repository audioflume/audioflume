"use client";

import {
  Button,
  Card,
  CardTitle,
  LicenseIcon,
  MailIcon,
  TicketIcon,
  VisualPanel,
} from "../AccountUI";

export default function SupportSection() {
  const cards = [
    {
      title: "Submit a ticket",
      description: "Send a detailed issue report for billing, song files, downloads, licensing, or account problems.",
      action: "Start ticket",
      icon: <TicketIcon />,
    },
    {
      title: "Contact support",
      description: "Reach the Filmwave team directly for account questions or help using the library.",
      action: "Email support",
      icon: <MailIcon />,
    },
    {
      title: "License help",
      description: "Find answers about commercial usage, client projects, social ads, and broadcast-style work.",
      action: "View license guide",
      icon: <LicenseIcon />,
    },
  ];

  const faqs = [
    ["Can I use Filmwave songs in client work?", "Yes. Filmwave is structured for royalty-free commercial project use."],
    ["Can I download stems?", "Tracks that include stems can expose them directly from the song card or player menu when configured."],
    ["How do I report a broken file?", "Submit a support ticket with the song title and issue type."],
  ];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Card key={card.title} className="group">
            <VisualPanel index={index} />
            <div className="p-4">
              <div className="text-sm font-medium text-[var(--text-primary)]">{card.title}</div>
              <p className="mt-2 min-h-[66px] text-xs leading-5 text-[var(--text-muted)]">{card.description}</p>
              <div className="mt-4">
                <Button dark>
                  {card.action} {card.icon}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardTitle title="Frequently asked questions" />
        <div className="divide-y divide-[var(--border)]">
          {faqs.map(([question, answer]) => (
            <div key={question} className="px-4 py-3.5">
              <div className="text-sm font-medium text-[var(--text-primary)]">{question}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
