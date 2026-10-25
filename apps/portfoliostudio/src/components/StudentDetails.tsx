import { Plus, Trash } from "@phosphor-icons/react";
import { newId } from "../../shared/portfolio";
import {
  studentCategories,
  type StudentEntry,
  type StudentProfile,
} from "../../shared/student";
import "./StudentDetails.css";

type StudentDetailsProps = {
  value: StudentProfile;
  onChange: (value: StudentProfile) => void;
};

const labels: Record<(typeof studentCategories)[number], string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  volunteering: "Volunteering",
  skills: "Skills",
  interests: "Interests",
  achievements: "Achievements",
};

function blankEntry(): StudentEntry {
  return {
    id: newId("student-entry"),
    title: "",
    subtitle: "",
    description: "",
    image: "",
    imageAlt: "",
    url: "",
    tags: [],
    date: "",
  };
}

export function StudentDetails({ value, onChange }: StudentDetailsProps) {
  const set = <K extends keyof StudentProfile>(
    key: K,
    next: StudentProfile[K],
  ) => onChange({ ...value, [key]: next });
  const updateEntry = (
    category: (typeof studentCategories)[number],
    id: string,
    patch: Partial<StudentEntry>,
  ) => {
    set(
      category,
      value[category].map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  };
  const addEntry = (category: (typeof studentCategories)[number]) =>
    set(category, [...value[category], blankEntry()]);
  const removeEntry = (
    category: (typeof studentCategories)[number],
    id: string,
  ) =>
    set(
      category,
      value[category].filter((entry) => entry.id !== id),
    );

  return (
    <div className="student-details">
      <div className="student-details-intro">
        <span className="eyebrow">REVIEW YOUR DETAILS</span>
        <p>
          Add or correct what feels useful, and leave sections empty if they do
          not belong on your portfolio. You can change everything later.
        </p>
      </div>

      <div className="student-details-fields">
        <label>
          Your name
          <input
            autoComplete="name"
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={120}
            placeholder="e.g. Amina Patel"
          />
        </label>
        <label>
          Headline
          <input
            value={value.headline}
            onChange={(event) => set("headline", event.target.value)}
            maxLength={240}
            placeholder="e.g. Computer science student & creative developer"
          />
        </label>
        <label>
          About you <span className="optional">optional</span>
          <textarea
            value={value.bio}
            onChange={(event) => set("bio", event.target.value)}
            maxLength={6000}
            rows={5}
            placeholder="Your interests, what you are working on, and where you want to go."
          />
        </label>
        <div className="student-details-two-up">
          <label>
            Location <span className="optional">optional</span>
            <input
              value={value.location}
              onChange={(event) => set("location", event.target.value)}
              maxLength={120}
              placeholder="e.g. Guildford, UK"
            />
          </label>
          <label>
            Email <span className="optional">optional</span>
            <input
              type="email"
              autoComplete="email"
              value={value.email}
              onChange={(event) => set("email", event.target.value)}
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
        </div>
        <details className="student-extra">
          <summary>
            Optional profile image <span>Added later in the editor</span>
          </summary>
          <label>
            Photo URL <span className="optional">optional</span>
            <input
              value={value.photo}
              onChange={(event) => set("photo", event.target.value)}
              maxLength={600000}
              placeholder="https://…"
            />
          </label>
        </details>
      </div>

      <details className="student-links">
        <summary>
          Links <span>{value.links.length || "None yet"}</span>
        </summary>
        <div className="student-details-list">
          {value.links.map((link) => (
            <div className="student-link-row" key={link.id}>
              <label>
                Label
                <input
                  value={link.label}
                  onChange={(event) =>
                    set(
                      "links",
                      value.links.map((candidate) =>
                        candidate.id === link.id
                          ? { ...candidate, label: event.target.value }
                          : candidate,
                      ),
                    )
                  }
                  maxLength={80}
                />
              </label>
              <label>
                URL
                <input
                  value={link.url}
                  onChange={(event) =>
                    set(
                      "links",
                      value.links.map((candidate) =>
                        candidate.id === link.id
                          ? { ...candidate, url: event.target.value }
                          : candidate,
                      ),
                    )
                  }
                  maxLength={2048}
                  placeholder="https://…"
                />
              </label>
              <button
                className="icon-button student-remove"
                type="button"
                aria-label={`Remove ${link.label || "link"}`}
                onClick={() =>
                  set(
                    "links",
                    value.links.filter((candidate) => candidate.id !== link.id),
                  )
                }
              >
                <Trash />
              </button>
            </div>
          ))}
          <button
            className="text-button student-add"
            type="button"
            onClick={() =>
              set("links", [
                ...value.links,
                { id: newId("link"), label: "", url: "" },
              ])
            }
          >
            <Plus /> Add a link
          </button>
        </div>
      </details>

      <div className="student-categories">
        {studentCategories.map((category) => (
          <details className="student-category" key={category}>
            <summary>
              {labels[category]}{" "}
              <span>{value[category].length || "None yet"}</span>
            </summary>
            <div className="student-details-list">
              {value[category].map((entry) => (
                <fieldset className="student-entry" key={entry.id}>
                  <legend>
                    {entry.title ||
                      `New ${labels[category].toLowerCase()} entry`}
                  </legend>
                  <label>
                    Title
                    <input
                      value={entry.title}
                      onChange={(event) =>
                        updateEntry(category, entry.id, {
                          title: event.target.value,
                        })
                      }
                      maxLength={240}
                      placeholder={`e.g. ${labels[category]} entry`}
                    />
                  </label>
                  <div className="student-details-two-up">
                    <label>
                      Subtitle <span className="optional">optional</span>
                      <input
                        value={entry.subtitle}
                        onChange={(event) =>
                          updateEntry(category, entry.id, {
                            subtitle: event.target.value,
                          })
                        }
                        maxLength={240}
                      />
                    </label>
                    <label>
                      Date <span className="optional">optional</span>
                      <input
                        value={entry.date}
                        onChange={(event) =>
                          updateEntry(category, entry.id, {
                            date: event.target.value,
                          })
                        }
                        maxLength={100}
                        placeholder="e.g. 2024–2026"
                      />
                    </label>
                  </div>
                  <label>
                    Description <span className="optional">optional</span>
                    <textarea
                      value={entry.description}
                      onChange={(event) =>
                        updateEntry(category, entry.id, {
                          description: event.target.value,
                        })
                      }
                      maxLength={4000}
                      rows={3}
                    />
                  </label>
                  <details className="student-entry-extras">
                    <summary>
                      Links and images <span>optional</span>
                    </summary>
                    <div className="student-details-list">
                      <div className="student-details-two-up">
                        <label>
                          Link <span className="optional">optional</span>
                          <input
                            value={entry.url}
                            onChange={(event) =>
                              updateEntry(category, entry.id, {
                                url: event.target.value,
                              })
                            }
                            maxLength={2048}
                            placeholder="https://…"
                          />
                        </label>
                        <label>
                          Image URL <span className="optional">optional</span>
                          <input
                            value={entry.image}
                            onChange={(event) =>
                              updateEntry(category, entry.id, {
                                image: event.target.value,
                              })
                            }
                            maxLength={600000}
                            placeholder="https://…"
                          />
                        </label>
                      </div>
                      <label>
                        Image description{" "}
                        <span className="optional">optional</span>
                        <input
                          value={entry.imageAlt}
                          onChange={(event) =>
                            updateEntry(category, entry.id, {
                              imageAlt: event.target.value,
                            })
                          }
                          maxLength={240}
                        />
                      </label>
                      <label>
                        Tags{" "}
                        <span className="optional">
                          optional · comma separated
                        </span>
                        <input
                          value={entry.tags.join(", ")}
                          onChange={(event) =>
                            updateEntry(category, entry.id, {
                              tags: event.target.value
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                            })
                          }
                          maxLength={1200}
                        />
                      </label>
                    </div>
                  </details>
                  <button
                    className="text-button student-delete-entry"
                    type="button"
                    onClick={() => removeEntry(category, entry.id)}
                  >
                    <Trash /> Remove entry
                  </button>
                </fieldset>
              ))}
              <button
                className="text-button student-add"
                type="button"
                onClick={() => addEntry(category)}
              >
                <Plus /> Add {labels[category].toLowerCase()}
              </button>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
