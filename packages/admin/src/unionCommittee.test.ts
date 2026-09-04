import { describe, expect, it } from 'vitest';
import { parseUnionCommitteeOfficers } from './unionCommittee';

describe('Students Union committee parser', () => {
  it('returns only the three signatory officers in display order', () => {
    const html = `
      <div><h4 class="line-clamp-2 capitalize">Josh Knott</h4><h5>President</h5></div>
      <div><h4 class="line-clamp-2 capitalize">Poppy Holmes</h4><h5>Vice-President</h5></div>
      <div><h4 class="line-clamp-2 capitalize">Vinayak Manojkumar Vadhera</h4><h5>Treasurer</h5></div>
      <div><h4 class="line-clamp-2 capitalize">Another Member</h4><h5>Social Secretary</h5></div>
    `;

    expect(parseUnionCommitteeOfficers(html)).toEqual([
      { name: 'Josh Knott', role: 'President' },
      { name: 'Poppy Holmes', role: 'Vice President' },
      { name: 'Vinayak Manojkumar Vadhera', role: 'Treasurer' },
    ]);
  });

  it('fails closed when the page does not contain all three roles', () => {
    expect(() =>
      parseUnionCommitteeOfficers('<h4 class="line-clamp-2 capitalize">Josh Knott</h4><h5>President</h5>'),
    ).toThrow(/Vice President, Treasurer/);
  });
});
