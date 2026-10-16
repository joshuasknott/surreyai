import type { PlannerMention } from '../../../../convex/plannerModel';
import { mentionTokens } from '../../../../convex/lib/plannerMentions';

let pickerId = 0;

export function appendMentionText(container: HTMLElement, text: string, people: PlannerMention[] = []) {
  const known = new Map(people.map(person => [person.email, person])); let offset = 0;
  for (const token of mentionTokens(text)) {
    const person = known.get(token.email); if (!person) continue;
    container.append(document.createTextNode(text.slice(offset, token.start)));
    const tag = document.createElement('span'); tag.className = 'comment-mention'; tag.textContent = `@${person.name}`; tag.title = person.email;
    container.append(tag); offset = token.end;
  }
  container.append(document.createTextNode(text.slice(offset)));
}

export function createMentionPicker(input: HTMLTextAreaElement, getPeople: () => PlannerMention[]) {
  const wrapper = document.createElement('div'); wrapper.className = 'mention-input'; input.replaceWith(wrapper); wrapper.append(input);
  const list = document.createElement('div'); list.id = `mention-picker-${++pickerId}`; list.className = 'mention-picker'; list.hidden = true; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Mention a committee member'); wrapper.append(list);
  input.setAttribute('aria-controls', list.id); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-autocomplete', 'list');
  let options: PlannerMention[] = []; let selected = 0; let start = 0; let end = 0;
  function close() { list.hidden = true; list.replaceChildren(); options = []; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function choose(person: PlannerMention) {
    input.setRangeText(`@${person.email} `, start, end, 'end'); close(); input.focus(); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function render() {
    list.replaceChildren(); list.hidden = false; input.setAttribute('aria-expanded', 'true');
    options.forEach((person, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.id = `${list.id}-${index}`; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', String(index === selected));
      const name = document.createElement('strong'); name.textContent = person.name; const email = document.createElement('span'); email.textContent = person.email; button.append(name, email);
      button.onpointerdown = event => event.preventDefault(); button.onclick = () => choose(person); list.append(button);
    });
    if (options.length) input.setAttribute('aria-activedescendant', `${list.id}-${selected}`);
    else { input.removeAttribute('aria-activedescendant'); const empty = document.createElement('p'); empty.textContent = 'No matching committee members.'; empty.setAttribute('role', 'status'); list.append(empty); }
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  function update() {
    if (input.disabled || input.selectionStart !== input.selectionEnd) { close(); return; }
    const match = /(?:^|\s)@([^\s]*)$/.exec(input.value.slice(0, input.selectionStart));
    if (!match) { close(); return; }
    start = input.selectionStart - match[1].length - 1; end = input.selectionStart; selected = 0;
    const query = match[1].toLowerCase(); options = getPeople().filter(person => `${person.name} ${person.email}`.toLowerCase().includes(query)).slice(0, 6); render();
  }
  function keydown(event: KeyboardEvent) {
    if (list.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (['ArrowDown', 'ArrowUp'].includes(event.key) && options.length) {
      event.preventDefault(); selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; render();
    } else if ((event.key === 'Enter' || event.key === 'Tab') && options.length) { event.preventDefault(); choose(options[selected]); }
  }
  const blur = () => window.setTimeout(close, 0);
  const move = (event: KeyboardEvent) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) update(); };
  input.addEventListener('input', update); input.addEventListener('click', update); input.addEventListener('keydown', keydown); input.addEventListener('keyup', move); input.addEventListener('blur', blur);
  return { close, refresh() { if (document.activeElement === input && !list.hidden) update(); }, destroy() { close(); input.removeEventListener('input', update); input.removeEventListener('click', update); input.removeEventListener('keydown', keydown); input.removeEventListener('keyup', move); input.removeEventListener('blur', blur); } };
}
