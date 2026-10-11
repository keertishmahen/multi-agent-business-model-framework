import { useState } from "react";
import {
  Sparkles,
  Lightbulb,
  Handshake,
  Rocket,
  Users,
  X,
  Check,
  LayoutDashboard,
  Bot,
  Shield,
  BookOpen,
  GitBranch,
  Flag,
  ArrowUpRight,
} from "lucide-react";
import { APP_NAME, APP_DESCRIPTION, APP_TAGLINE } from "../constants/branding";
import useInViewOnce from "../hooks/useInViewOnce";

const NAV_LINKS = [
  { id: "who", label: "Who" },
  { id: "platform", label: "Platform" },
  { id: "process", label: "Process" },
  { id: "values", label: "Values" },
  { id: "why", label: "Why" },
];

const GLOSSARY = [
  { term: "SWOT", definition: "Strengths, Weaknesses, Opportunities, and Threats — a framework for strategic analysis." },
  { term: "SDG", definition: "Sustainable Development Goals — 17 global goals adopted by the United Nations for 2030." },
  { term: "BMC", definition: "Expanded Business Model Canvas — an 11-block template describing how a business creates value, including social and environmental impact." },
  { term: "DTM", definition: "Dilemma Triangle Method — a People–Planet–Prosperity framework for surfacing and ranking strategic trade-offs in SDG-aligned planning." },
  { term: "Value Proposition", definition: "The unique benefit your product or service provides to a specific customer segment." },
  { term: "Tension Matrix", definition: "A grid showing where your goals conflict — e.g. faster growth vs. lower emissions." },
];

const GLOSSARY_PREVIEW_COUNT = 3;

const WHO_CARDS = [
  {
    title: "Built for growing ideas",
    text: "For startups and SMBs that need a structured model without hiring a full strategy team.",
  },
  {
    title: "Multi-intelligence guidance",
    text: "Grounded in guided steps, critique, and SDG awareness — not a blank chatbot chat.",
  },
  {
    title: "Designed to ship",
    text: "Outputs you can refine, export, and use — not a one-off report that dies in a folder.",
  },
];

const PLATFORM_CARDS = [
  {
    title: "Co-pilot workspace",
    text: "One place to move from idea to model with guided steps and live agent support.",
    Icon: LayoutDashboard,
  },
  {
    title: "Specialist insights",
    text: "Critique, SDG, and domain specialists surface tensions and opportunities as you go.",
    Icon: Bot,
  },
  {
    title: "Private by default",
    text: "Your work stays in the browser — you control what gets exported and shared.",
    Icon: Shield,
  },
];

const PROCESS_CARDS = [
  {
    title: "Story",
    text: "Share your idea and who you serve — type or speak — to ground everything that follows.",
    Icon: BookOpen,
  },
  {
    title: "Focus & tensions",
    text: "Clarify drivers, issues, and trade-offs so goals don’t silently conflict.",
    Icon: GitBranch,
  },
  {
    title: "Model & plan",
    text: "Build SWOT, canvas, and an actionable plan you can refine and take forward.",
    Icon: Flag,
  },
];

const VALUE_CARDS = [
  {
    title: "Clarity over complexity",
    text: "We prefer simple, well-defined paths that teams can understand and finish.",
    Icon: Lightbulb,
  },
  {
    title: "Trust and transparency",
    text: "You always know what the agents suggest, why, and what stays yours.",
    Icon: Handshake,
  },
  {
    title: "Built for the long term",
    text: "We optimize for lasting models — not short-term planning hacks.",
    Icon: Rocket,
  },
  {
    title: "Business-first thinking",
    text: "Co-creation should support real decisions, not just look impressive.",
    Icon: Users,
  },
];

const PROBLEMS = [
  "Blank-page overwhelm",
  "Goals conflict without clarity",
  "SDG claims without grounding",
  "Plans that don’t survive contact with users",
  "Low confidence in next steps",
];

const WITH_STUDIO = [
  "Structured 10-step path",
  "Tension spotting as you go",
  "SDG-aware prompts",
  "Editable, exportable outputs",
  "You stay in control of decisions",
];

function aboutClass(inView, extra = "") {
  return ["entry-about", extra, inView ? "entry-about--visible" : ""]
    .filter(Boolean)
    .join(" ");
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

export default function OnboardingScreen({
  onStartCreating,
  onTakeTour,
  savedPlansCount = 0,
  onViewSavedPlans,
}) {
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [glossaryExpanded, setGlossaryExpanded] = useState(false);
  const [whoRef, whoInView] = useInViewOnce();
  const [platformRef, platformInView] = useInViewOnce();
  const [processRef, processInView] = useInViewOnce();
  const [valuesRef, valuesInView] = useInViewOnce();
  const [whyRef, whyInView] = useInViewOnce();

  function handleStartCreating() {
    setButtonsDisabled(true);
    onStartCreating();
  }

  const visibleGlossary = glossaryExpanded ? GLOSSARY : GLOSSARY.slice(0, GLOSSARY_PREVIEW_COUNT);
  const disabledStyle = {
    opacity: buttonsDisabled ? 0.5 : 1,
    cursor: buttonsDisabled ? "not-allowed" : "pointer",
  };

  return (
    <div className="entry-screen entry-screen--wide entry-screen--hero">
      <main className="entry-shell entry-shell--hero animate-fade-in" aria-label="Onboarding">
        <header className="entry-nav entry-nav--moc">
          <div className="entry-nav__brand">
            <div className="entry-nav__logo" aria-hidden="true">
              <Sparkles size={16} strokeWidth={2} />
            </div>
            <div className="entry-nav__brand-text">
              <span className="entry-nav__name">{APP_NAME}</span>
              <span className="entry-nav__tagline">{APP_TAGLINE}</span>
            </div>
          </div>

          <nav className="entry-nav__pill" aria-label="Onboarding sections">
            {NAV_LINKS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className="entry-nav__link"
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="entry-nav__link entry-nav__link--tour"
              onClick={onTakeTour}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Tour
            </button>
          </nav>

          <button
            type="button"
            className="btn-primary entry-nav__cta"
            onClick={handleStartCreating}
            disabled={buttonsDisabled}
            style={disabledStyle}
          >
            Start creating
            <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </header>

        <section className="entry-hero" aria-labelledby="entry-hero-brand">
          <p id="entry-hero-brand" className="entry-hero__brand">
            {APP_NAME}
          </p>
          <h1 className="entry-hero__headline">
            Co-create your SDG-aligned business model in 30 minutes.
          </h1>
          <p className="entry-hero__support">
            {APP_NAME} is your {APP_DESCRIPTION} — guided steps, SDG alignment, and clear next actions.
          </p>
          <nav className="entry-hero__cta" aria-label="Getting started">
            <button
              type="button"
              className="btn-primary entry-hero__primary"
              onClick={handleStartCreating}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Start creating
            </button>
            <button
              type="button"
              className="entry-hero__secondary"
              onClick={onTakeTour}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Take a tour
            </button>
          </nav>
        </section>

        <section
          id="who"
          ref={whoRef}
          className={aboutClass(whoInView)}
          aria-labelledby="who-heading"
        >
          <div className="entry-about__intro" style={{ "--entry-stagger": 0 }}>
            <span className="entry-pill entry-reveal">Who We Are</span>
            <h2 id="who-heading" className="entry-about__title entry-reveal" style={{ "--entry-stagger": 1 }}>
              Who We Are
            </h2>
            <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
              Business Model Studio helps founders and teams co-create clear, SDG-aligned business models — so strategy stays actionable, not buried in slides.
            </p>
          </div>
          <div className="entry-about__grid">
            {WHO_CARDS.map(({ title, text }, index) => (
              <article
                key={title}
                className="entry-glass-card entry-reveal"
                style={{ "--entry-stagger": index + 3 }}
              >
                <h3 className="entry-glass-card__title">{title}</h3>
                <p className="entry-glass-card__text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="platform"
          ref={platformRef}
          className={aboutClass(platformInView, "entry-about--platform")}
          aria-labelledby="platform-heading"
        >
          <div className="entry-about__intro">
            <span className="entry-pill entry-reveal" style={{ "--entry-stagger": 0 }}>Platform</span>
            <h2
              id="platform-heading"
              className="entry-about__title entry-reveal"
              style={{ "--entry-stagger": 1 }}
            >
              The Platform
            </h2>
            <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
              Multi-intelligence agents that co-create with you — guided steps, critique, and SDG awareness in one workspace.
            </p>
          </div>
          <div className="entry-about__grid">
            {PLATFORM_CARDS.map(({ title, text, Icon }, index) => (
              <article
                key={title}
                className="entry-glass-card entry-glass-card--value entry-reveal"
                style={{ "--entry-stagger": index + 3 }}
              >
                <div className="entry-glass-card__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="entry-glass-card__title">{title}</h3>
                <p className="entry-glass-card__text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="process"
          ref={processRef}
          className={aboutClass(processInView, "entry-about--process")}
          aria-labelledby="process-heading"
        >
          <div className="entry-about__intro">
            <span className="entry-pill entry-reveal" style={{ "--entry-stagger": 0 }}>Process</span>
            <h2
              id="process-heading"
              className="entry-about__title entry-reveal"
              style={{ "--entry-stagger": 1 }}
            >
              How it works
            </h2>
            <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
              A clear path from story to an actionable model — about 30 minutes, step by step.
            </p>
          </div>
          <div className="entry-about__grid">
            {PROCESS_CARDS.map(({ title, text, Icon }, index) => (
              <article
                key={title}
                className="entry-glass-card entry-glass-card--value entry-reveal"
                style={{ "--entry-stagger": index + 3 }}
              >
                <div className="entry-glass-card__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="entry-glass-card__title">{title}</h3>
                <p className="entry-glass-card__text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="values"
          ref={valuesRef}
          className={aboutClass(valuesInView, "entry-about--values")}
          aria-labelledby="values-heading"
        >
          <div className="entry-about__intro">
            <span className="entry-pill entry-reveal" style={{ "--entry-stagger": 0 }}>Our Values</span>
            <h2
              id="values-heading"
              className="entry-about__title entry-reveal"
              style={{ "--entry-stagger": 1 }}
            >
              The Values Behind Business Model Studio
            </h2>
            <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
              A few principles that keep co-creation useful, trustworthy, and sustainable.
            </p>
          </div>
          <div className="entry-values__grid">
            {VALUE_CARDS.map(({ title, text, Icon }, index) => (
              <article
                key={title}
                className="entry-glass-card entry-glass-card--value entry-reveal"
                style={{ "--entry-stagger": index + 3 }}
              >
                <div className="entry-glass-card__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="entry-glass-card__title">{title}</h3>
                <p className="entry-glass-card__text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="why"
          ref={whyRef}
          className={aboutClass(whyInView, "entry-about--why")}
          aria-labelledby="why-heading"
        >
          <div className="entry-about__intro">
            <span className="entry-pill entry-reveal" style={{ "--entry-stagger": 0 }}>Why us</span>
            <h2
              id="why-heading"
              className="entry-about__title entry-reveal"
              style={{ "--entry-stagger": 1 }}
            >
              What makes Business Model Studio different
            </h2>
            <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
              Foundations you can rely on — not one-off tips or a black-box plan generator.
            </p>
          </div>
          <div className="entry-why__grid">
            <article className="entry-why-card entry-reveal" style={{ "--entry-stagger": 3 }}>
              <h3 className="entry-why-card__title">Common planning problems</h3>
              <ul className="entry-why-card__list">
                {PROBLEMS.map((item) => (
                  <li key={item}>
                    <span className="entry-why-card__mark entry-why-card__mark--bad" aria-hidden="true">
                      <X size={14} strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article
              className="entry-why-card entry-why-card--highlight entry-reveal"
              style={{ "--entry-stagger": 4 }}
            >
              <h3 className="entry-why-card__title">With Business Model Studio</h3>
              <ul className="entry-why-card__list">
                {WITH_STUDIO.map((item) => (
                  <li key={item}>
                    <span className="entry-why-card__mark entry-why-card__mark--good" aria-hidden="true">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="entry-glossary entry-glossary--quiet" aria-labelledby="glossary-heading">
          <h2 id="glossary-heading" className="entry-about__title entry-about__title--sm">
            Key terms
          </h2>
          {savedPlansCount > 0 && onViewSavedPlans && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                You have {savedPlansCount} saved plan{savedPlansCount === 1 ? "" : "s"} in this browser.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={onViewSavedPlans}
                style={{ fontSize: 13 }}
              >
                View saved plans
              </button>
            </div>
          )}
          <div className="entry-glossary__list">
            {visibleGlossary.map(({ term, definition }) => (
              <div key={term} className="entry-glossary__row">
                <span className="entry-glossary__term">{term}</span>
                <p className="entry-glossary__def">{definition}</p>
              </div>
            ))}
            {GLOSSARY.length > GLOSSARY_PREVIEW_COUNT && (
              <button
                type="button"
                className="entry-glossary__toggle"
                onClick={() => setGlossaryExpanded((v) => !v)}
                aria-expanded={glossaryExpanded}
                aria-label={glossaryExpanded ? "Show fewer glossary terms" : "Show all glossary terms"}
              >
                {glossaryExpanded ? "Show fewer" : "Show all glossary"}
                <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
