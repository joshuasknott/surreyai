import { Check } from "@phosphor-icons/react";
import "./workshop.css";

const steps = [
  { id: "details", label: "Add details" },
  { id: "design", label: "Choose design" },
  { id: "personalise", label: "Personalise" },
  { id: "publish", label: "Publish" },
] as const;

export function WorkshopSteps({
  current,
}: {
  current: (typeof steps)[number]["id"];
  projectId?: string;
}) {
  const active = steps.findIndex((step) => step.id === current);
  return (
    <ol className="workshop-steps" aria-label="Portfolio progress">
      {steps.map((step, index) => (
        <li
          key={step.id}
          aria-current={index === active ? "step" : undefined}
          className={
            index < active ? "complete" : index === active ? "current" : ""
          }
        >
          <span className="workshop-step-number" aria-hidden="true">
            {index < active ? <Check size={13} weight="bold" /> : index + 1}
          </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
