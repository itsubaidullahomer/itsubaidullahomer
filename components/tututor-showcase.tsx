"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Expand,
  GitBranch,
  GraduationCap,
  Layers3,
  Smartphone,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  tututorViews,
  type TututorShot,
  type TututorView,
} from "@/content/tututor-showcase";
import { MobileCardDetails } from "./mobile-card-details";
import { ScreenshotViewport } from "./screenshot-viewport";

const icons = [
  Sparkles,
  BookOpen,
  GitBranch,
  GraduationCap,
  Smartphone,
  Layers3,
];
const shotCount = tututorViews.reduce(
  (total, view) => total + view.shots.length,
  0,
);
const desktopQuery = "(min-width: 760px)";
function subscribeToLayout(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function ProductImage({
  shot,
  original = false,
  sizes,
}: {
  shot: TututorShot;
  original?: boolean;
  sizes: string;
}) {
  return (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      quality={90}
      unoptimized={original}
      loading={original ? "eager" : undefined}
      sizes={sizes}
      draggable={false}
    />
  );
}

function ShowcasePanel({ view }: { view: TututorView }) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const shot = view.shots[selected];
  const isPhone = shot.format === "phone";
  const isPortrait = shot.format === "portrait";
  const multiple = view.shots.length > 1;
  const previous = (selected - 1 + view.shots.length) % view.shots.length;
  const next = (selected + 1) % view.shots.length;
  const leftPhone = selected === 0 ? 2 : previous;
  function select(index: number) {
    setSelected(index);
    setActualSize(false);
  }
  return (
    <Dialog.Root
      open={expanded}
      onOpenChange={(open) => {
        setExpanded(open);
        setActualSize(false);
      }}
    >
      <div className="tututor-panel">
        <div className="tututor-preview-heading">
          <span>
            <i aria-hidden="true" />
            {view.product}
          </span>
          <Dialog.Trigger className="tututor-inspect">
            <Expand size={13} /> Inspect screens
          </Dialog.Trigger>
        </div>
        <div
          className={`tututor-stage${isPhone ? " tututor-stage-mobile" : ""}${isPortrait ? " tututor-stage-portrait" : ""}`}
        >
          {isPhone ? (
            <div className="tututor-phone-lineup">
              <button
                className="tututor-phone tututor-phone-side tututor-phone-left"
                aria-label={`Show ${view.shots[leftPhone].label}`}
                onClick={() => select(leftPhone)}
              >
                <ProductImage shot={view.shots[leftPhone]} sizes="180px" />
              </button>
              <Dialog.Trigger
                className="tututor-phone tututor-phone-main"
                aria-label={`Enlarge ${shot.label}`}
              >
                <ProductImage
                  shot={shot}
                  sizes="(max-width: 540px) 145px, 200px"
                />
                <span className="tututor-phone-zoom" aria-hidden="true">
                  <Expand size={13} />
                </span>
              </Dialog.Trigger>
              <button
                className="tututor-phone tututor-phone-side tututor-phone-right"
                aria-label={`Show ${view.shots[next].label}`}
                onClick={() => select(next)}
              >
                <ProductImage shot={view.shots[next]} sizes="180px" />
              </button>
            </div>
          ) : (
            <Dialog.Trigger
              className={`tututor-screen${isPortrait ? " tututor-screen-portrait" : ""}`}
              aria-label={`Enlarge ${shot.label}`}
            >
              {!isPortrait && (
                <span className="tututor-screen-chrome" aria-hidden="true">
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{shot.label}</span>
                  <Expand size={12} />
                </span>
              )}
              <ProductImage
                shot={shot}
                sizes="(max-width: 759px) 90vw, (max-width: 1100px) 65vw, 850px"
              />
            </Dialog.Trigger>
          )}
          <span className="tututor-stage-label">
            {isPhone
              ? "iOS + Android · Demo school"
              : isPortrait
                ? "Design exploration"
                : "Inside the product"}
          </span>
        </div>
        <Dialog.Trigger
          className="screenshot-tap-hint tututor-tap-hint"
          aria-label={`View ${shot.label} full size`}
        >
          <Expand size={13} aria-hidden="true" />
          {isPhone
            ? "Tap the center phone to view full size"
            : "Tap to view full size"}
        </Dialog.Trigger>
        <div className="tututor-caption" aria-live="polite" aria-atomic="true">
          <MobileCardDetails
            label={shot.label}
            meta={`${String(selected + 1).padStart(2, "0")} / ${String(view.shots.length).padStart(2, "0")}`}
            heading
          >
            <p>{shot.caption}</p>
          </MobileCardDetails>
        </div>
        {multiple && (
          <div
            className="tututor-thumbnails"
            role="group"
            aria-label={`${view.label} screenshots`}
          >
            {view.shots.map((item, index) => (
              <button
                key={item.src}
                className="tututor-thumbnail"
                aria-label={`Show ${item.label}`}
                aria-pressed={index === selected}
                onClick={() => select(index)}
              >
                <span
                  className={`tututor-thumb-image${item.format ? " tututor-thumb-portrait" : ""}`}
                >
                  <Image src={item.src} alt="" fill sizes="100px" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="tututor-decision">
          <MobileCardDetails label="The decision">
            <span>The decision</span>
            <p>{view.decision}</p>
          </MobileCardDetails>
        </div>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content tututor-lightbox"
          onKeyDown={(event) => {
            if (actualSize || !multiple) return;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              select(previous);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              select(next);
            }
          }}
        >
          <div className="tututor-lightbox-heading">
            <div>
              <Dialog.Title>
                {view.label} · {shot.label}
              </Dialog.Title>
              <Dialog.Description>{shot.caption}</Dialog.Description>
            </div>
            <Dialog.Close
              className="tututor-icon-button"
              aria-label="Close product screenshots"
            >
              <X size={19} />
            </Dialog.Close>
          </div>
          <ScreenshotViewport
            key={shot.src}
            actualSize={actualSize}
            multiple={multiple}
            label="Product screenshot"
            onStep={(direction) => select(direction === 1 ? next : previous)}
            previous={
              <ProductImage shot={view.shots[previous]} original sizes="95vw" />
            }
            next={
              <ProductImage shot={view.shots[next]} original sizes="95vw" />
            }
          >
            <ProductImage shot={shot} original sizes="95vw" />
          </ScreenshotViewport>
          <div className="tututor-lightbox-footer">
            <button
              onClick={() => setActualSize(!actualSize)}
              aria-pressed={actualSize}
            >
              {actualSize ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
              {actualSize ? "Fit to window" : "Original size"}
            </button>
            <div>
              <button
                className="tututor-icon-button"
                disabled={!multiple}
                aria-label="Previous product screenshot"
                onClick={() => select(previous)}
              >
                <ArrowLeft size={17} />
              </button>
              <span aria-live="polite" aria-atomic="true">
                {selected + 1} / {view.shots.length}
              </span>
              <button
                className="tututor-icon-button"
                disabled={!multiple}
                aria-label="Next product screenshot"
                onClick={() => select(next)}
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TututorShowcase() {
  const [activeView, setActiveView] = useState(tututorViews[0].id);
  const vertical = useSyncExternalStore(
    subscribeToLayout,
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
  const view = tututorViews.find((item) => item.id === activeView)!;
  return (
    <Tabs.Root
      className="tututor-showcase"
      value={activeView}
      onValueChange={setActiveView}
      orientation={vertical ? "vertical" : "horizontal"}
      data-accent={view.accent}
    >
      <div className="tututor-sidebar">
        <div className="tututor-sidebar-heading">
          <span>Explore the platform</span>
          <span>{shotCount} screens</span>
        </div>
        <Tabs.List className="tututor-tabs" aria-label="Tututor product areas">
          {tututorViews.map((item, index) => {
            const Icon = icons[index];
            return (
              <Tabs.Trigger
                key={item.id}
                value={item.id}
                className="tututor-tab"
              >
                <span className="tututor-tab-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.6} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <ChevronRight
                  size={14}
                  className="tututor-tab-arrow"
                  aria-hidden="true"
                />
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
        <div className="tututor-sidebar-note">
          <Layers3 size={17} aria-hidden="true" />
          <p>
            Eight products.
            <br />
            <strong>One shared foundation.</strong>
          </p>
        </div>
      </div>
      <div className="tututor-content">
        <div className="tututor-view-intro">
          <span>Product close-up</span>
          <h3>{view.title}</h3>
        </div>
        {tututorViews.map((item) => (
          <Tabs.Content
            key={item.id}
            value={item.id}
            className="tututor-tab-panel"
          >
            <ShowcasePanel view={item} />
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
