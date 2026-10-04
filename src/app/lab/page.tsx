import type { Metadata } from "next";
import {
  AlignWidget,
  FrameWidget,
  MarkWidget,
  StepsWidget,
} from "@/components/lab-widgets";

export const metadata: Metadata = {
  title: "Lab",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LabPage() {
  return (
    <main className="lab-page">
      <h1>Lab</h1>
      <p className="lab-lede">
        Objects that might sit inside the home paragraph. The live intro is
        unchanged.
      </p>

      <p className="lab-copy">
        I design software and build it{" "}
        <span className="lab-keep">
          in code <MarkWidget />,
        </span>{" "}
        so a{" "}
        <span className="lab-keep">
          sketch <FrameWidget />
        </span>{" "}
        can ship. I run{" "}
        <span className="lab-keep">
          workshops <AlignWidget />
        </span>{" "}
        with teams until we agree on what we&apos;re making and why, then write
        the{" "}
        <span className="lab-keep">
          next steps <StepsWidget />.
        </span>
      </p>

      <section className="lab-bench">
        <h2>Frame</h2>
        <div className="lab-preview">
          <FrameWidget />
        </div>
        <p className="lab-copy">
          I design software and build it in code, so a{" "}
          <span className="lab-keep">
            sketch <FrameWidget />
          </span>{" "}
          can ship.
        </p>
      </section>

      <section className="lab-bench">
        <h2>Align</h2>
        <div className="lab-preview">
          <AlignWidget />
        </div>
        <p className="lab-copy">
          I run{" "}
          <span className="lab-keep">
            workshops <AlignWidget />
          </span>{" "}
          with teams until we agree on what we&apos;re making and why, then
          write the next steps.
        </p>
      </section>

      <section className="lab-bench">
        <h2>Mark</h2>
        <div className="lab-preview">
          <MarkWidget />
        </div>
        <p className="lab-copy">
          I design software and build it{" "}
          <span className="lab-keep">
            in code <MarkWidget />,
          </span>{" "}
          so a sketch can ship.
        </p>
      </section>

      <section className="lab-bench">
        <h2>Steps</h2>
        <div className="lab-preview">
          <StepsWidget />
        </div>
        <p className="lab-copy">
          I run workshops with teams until we agree on what we&apos;re making
          and why, then write the{" "}
          <span className="lab-keep">
            next steps <StepsWidget />.
          </span>
        </p>
      </section>
    </main>
  );
}
