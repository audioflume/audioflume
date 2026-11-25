"use client";

import { useState } from "react";
import Link from "next/link";
import ModalShell from "@/components/ModalShell";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import type { Song } from "@/lib/types";
import styles from "./SongLicenseModal.module.css";

const USERS = [
  { value: "individual", title: "Individual", description: "Independent filmmakers, freelancers and content creators." },
  { value: "business", title: "Business", description: "Studios, production companies, agencies and brands." },
] as const;

const USAGES = [
  { value: "standard", title: "Online & client projects", description: "Web, social, YouTube and everyday client work." },
  { value: "custom", title: "Extended or custom use", description: "Broadcast, cinema, larger campaigns or other specialized needs." },
] as const;

export default function SongLicenseModal({ song, onClose }: { song: Song; onClose: () => void }) {
  const [userType, setUserType] = useState<string>("");
  const [usage, setUsage] = useState<string>("");
  const [review, setReview] = useState(false);
  const premium = song.licenseType === "premium";
  const custom = premium || usage === "custom";
  const selectedUser = USERS.find((option) => option.value === userType);
  const selectedUsage = USAGES.find((option) => option.value === usage);
  const subject = encodeURIComponent("Audioflume licensing enquiry");
  const body = encodeURIComponent([
    "I'd like to enquire about licensing this track:",
    "",
    "Track: " + song.title,
    "Artist: " + song.artist,
    "Track ID: " + song.id,
    "Licensing for: " + (selectedUser?.title ?? ""),
    "Intended use: " + (selectedUsage?.title ?? ""),
    "",
    "Project details:",
  ].join("\n"));

  return (
    <ModalShell isOpen title="License music" onClose={onClose}
      closeLabel="Close licensing modal" maxWidth="max-w-[720px]" maxHeight="850px"
      headerHeight="88px" bodyScroll bodyClassName="px-6 pb-0">
      <div className={styles.content}>
        <div className={styles.track}>
          {song.coverArt ? <img className={styles.cover} src={song.coverArt} alt="" /> : <span className={styles.cover} aria-hidden="true" />}
          <div className={styles.trackCopy}>
            <h3 title={song.title}>{song.title}</h3>
            <p>{song.artist}</p>
            <span className={styles.tag}>{premium ? "Artist premium" : "Subscription catalogue"}</span>
          </div>
        </div>
        {!review ? (
          <>
            <div>
              <h2 className={styles.heading}>Tell us about your project.</h2>
              <p className={styles.intro}>Find the licensing option that fits your work.</p>
            </div>
            <div className={styles.group} role="group" aria-label="Who are you licensing for?">
              <h3>Who are you licensing for?</h3>
              <div className={styles.options}>
                {USERS.map((option) => (
                  <button key={option.value} type="button" className={styles.option}
                    aria-pressed={userType === option.value} onClick={() => setUserType(option.value)}>
                    <span><strong>{option.title}</strong><small>{option.description}</small></span>
                    <span className={styles.radio} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.group} role="group" aria-label="Intended use">
              <h3>Intended use</h3>
              <div className={styles.options}>
                {USAGES.map((option) => (
                  <button key={option.value} type="button" className={styles.option}
                    aria-pressed={usage === option.value} onClick={() => setUsage(option.value)}>
                    <span><strong>{option.title}</strong><small>{option.description}</small></span>
                    <span className={styles.radio} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <button className={styles.primary} type="button" disabled={!userType || !usage} onClick={() => setReview(true)}>Continue <ArrowUpRightIcon size={16} /></button>
          </>
        ) : (
          <>
            <button type="button" className={styles.back} onClick={() => setReview(false)}>Back to project details</button>
            <div>
              <h2 className={styles.heading}>{custom ? "Request a license." : "Find your membership."}</h2>
              <p className={styles.intro}>{custom ? "We'll help establish the right commercial terms for this track and project." : "Explore Audioflume's membership options for subscription catalogue music."}</p>
            </div>
            <div className={styles.summary}>
              <p><strong>Licensing for:</strong> {selectedUser?.title}</p>
              <p><strong>Intended use:</strong> {selectedUsage?.title}</p>
              <p><strong>Track:</strong> {premium ? "Artist premium" : "Subscription catalogue"}</p>
            </div>
            {custom ? (
              <a className={styles.primary} href={`mailto:hello@filmwave.io?subject=${subject}&body=${body}`}>Contact licensing <ArrowUpRightIcon size={16} /></a>
            ) : (
              <>
                <Link className={styles.primary} href="/pricing" onClick={onClose}>Explore {userType === "business" ? "studio and enterprise" : "creative"} memberships <ArrowUpRightIcon size={16} /></Link>
                <Link className={styles.back} href="/account/membership" onClick={onClose}>Manage existing membership</Link>
              </>
            )}
            <p className={styles.note}>Coverage and eligibility must be confirmed under the applicable license terms. This selection does not issue a license or authorize a download.</p>
          </>
        )}
        <div className={styles.footer}>
          <span>Need assistance? <a href={`mailto:hello@filmwave.io?subject=${subject}&body=${body}`}>Contact support</a></span>
          <Link href="/artists/licensing" onClick={onClose}>Licensing information</Link>
        </div>
      </div>
    </ModalShell>
  );
}
