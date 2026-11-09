"use client";

import { useState } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  type ProductShowcaseContent,
  type ProductView,
} from "@/content/product-showcases";
import { MobileCardDetails } from "./mobile-card-details";
import { ScreenshotViewport } from "./screenshot-viewport";

function Screenshot({
  view,
  original = false,
  fullWidth = false,
}: {
  view: ProductView;
  original?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Image
      src={view.src}
      alt={view.alt}
      width={view.width}
      height={view.height}
      quality={90}
      unoptimized={original}
      loading={original ? "eager" : undefined}
      sizes={
        original
          ? "95vw"
          : fullWidth
            ? "(max-width: 1000px) 90vw, 850px"
            : "(max-width: 759px) 90vw, (max-width: 1100px) 55vw, 680px"
      }
      draggable={false}
    />
  );
}

export function ProductShowcase({
  content,
  fullWidth = false,
}: {
  content: ProductShowcaseContent;
  fullWidth?: boolean;
}) {
  const [selected, setSelected] = useState(content.views[0].id);
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const index = content.views.findIndex((view) => view.id === selected);
  const view = content.views[index];
  function select(id: string) {
    setSelected(id);
    setActualSize(false);
  }
  function step(direction: number) {
    select(
      content.views[
        (index + direction + content.views.length) % content.views.length
      ].id,
    );
  }
  return (
    <Dialog.Root
      open={expanded}
      onOpenChange={(open) => {
        setExpanded(open);
        setActualSize(false);
      }}
    >
      <Tabs.Root
        className="product-showcase"
        data-theme={content.theme}
        value={selected}
        onValueChange={select}
      >
        <div className="product-gallery-toolbar">
          <Tabs.List
            className="product-view-tabs"
            aria-label={`${content.name} product views`}
          >
            {content.views.map((item) => (
              <Tabs.Trigger key={item.id} value={item.id}>
                {item.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Dialog.Trigger
            className="product-inspect"
            aria-label={`Inspect ${content.name} screenshots`}
          >
            <Expand size={15} />
            <span>Inspect</span>
          </Dialog.Trigger>
        </div>
        {content.views.map((item) => (
          <Tabs.Content
            key={item.id}
            value={item.id}
            className="product-view-panel"
          >
            <div className="product-stage">
              <Dialog.Trigger
                className="product-screen"
                aria-label={`Enlarge ${content.name} ${item.label}`}
              >
                <span className="product-screen-bar" aria-hidden="true">
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    {content.name} / {item.label}
                  </span>
                  <Expand size={11} />
                </span>
                <span className="product-screen-image" data-focus={item.focus}>
                  <Screenshot view={item} fullWidth={fullWidth} />
                </span>
                <span className="screenshot-tap-hint" aria-hidden="true">
                  <Expand size={13} /> Tap to view full size
                </span>
              </Dialog.Trigger>
            </div>
            <div className="product-view-copy">
              <div className="product-view-source">
                <span>{item.sourceLabel}</span>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(content.views.length).padStart(2, "0")}
                </span>
              </div>
              {fullWidth ? (
                <>
                  <h4>{item.title}</h4>
                  <p>{item.decision}</p>
                </>
              ) : (
                <MobileCardDetails label={item.title} heading>
                  <p className="product-view-decision">{item.decision}</p>
                </MobileCardDetails>
              )}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content tututor-lightbox"
          onKeyDown={(event) => {
            if (actualSize) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              step(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <div className="tututor-lightbox-heading">
            <div>
              <Dialog.Title>
                {content.name} · {view.label}
              </Dialog.Title>
              <Dialog.Description>{view.sourceNote}</Dialog.Description>
            </div>
            <Dialog.Close
              className="tututor-icon-button"
              aria-label={`Close ${content.name} screenshots`}
            >
              <X size={19} />
            </Dialog.Close>
          </div>
          <ScreenshotViewport
            key={view.id}
            actualSize={actualSize}
            multiple={content.views.length > 1}
            label={`${content.name} screenshot`}
            onStep={step}
            previous={
              <Screenshot
                view={
                  content.views[
                    (index - 1 + content.views.length) % content.views.length
                  ]
                }
                original
              />
            }
            next={
              <Screenshot
                view={content.views[(index + 1) % content.views.length]}
                original
              />
            }
          >
            <Screenshot view={view} original />
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
                aria-label={`Previous ${content.name} screenshot`}
                onClick={() => step(-1)}
              >
                <ArrowLeft size={17} />
              </button>
              <span aria-live="polite" aria-atomic="true">
                {index + 1} / {content.views.length}
              </span>
              <button
                className="tututor-icon-button"
                aria-label={`Next ${content.name} screenshot`}
                onClick={() => step(1)}
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
