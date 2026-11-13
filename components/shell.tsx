"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Menu, X } from "lucide-react";
const links = [
  ["Work", "/work"],
  ["About", "/about"],
  ["Writing", "/writing"],
  ["Experiments", "/playground"],
];
const cv = "/Ubaidullah-CV.pdf";
export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Ubaidullah Omer, home">
      ubaid
      <span className="wordmark-star" aria-hidden="true">
        ✳
      </span>
    </Link>
  );
}
export function Navbar() {
  const [pathScrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`nav-wrap ${pathScrolled ? "is-scrolled" : ""}`}>
      <nav aria-label="Main navigation" className="navbar">
        <Wordmark />
        <div className="nav-links">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <a className="nav-cv" href={cv} download>
            CV <ArrowDownToLine size={13} />
          </a>
          <Link className="button button-primary" href="/contact">
            Get in touch <ArrowUpRight size={15} />
          </Link>
          <button
            className="menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
      {open && (
        <div
          id="mobile-nav"
          className="mobile-nav"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {links.map(([label, href]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)}>
              {label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
          <Link href="/contact" onClick={() => setOpen(false)}>
            Contact
            <ArrowUpRight size={16} />
          </Link>
          <a href={cv} download onClick={() => setOpen(false)}>
            Download CV
            <ArrowDownToLine size={16} />
          </a>
        </div>
      )}
    </header>
  );
}
