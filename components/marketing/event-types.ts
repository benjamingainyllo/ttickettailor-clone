/**
 * The kinds of event people actually sell tickets to here.
 *
 * Shared between the home page's grid and the full /event-types page, so
 * the two can never drift apart. Deliberately Nigeria-first — an owambe
 * and a church programme belong on this list far more than a PTA meeting.
 */

export interface EventType {
  name: string;
  tone: string;
  blurb: string;
}

export const EVENT_TYPES: EventType[] = [
  { name: "Concerts & live music", tone: "#FFB3C7", blurb: "Early Bird, General, VIP table — three prices, three allocations, one link." },
  { name: "Club nights", tone: "#B7C4FF", blurb: "Cap the room, sell to the door, and stop counting transfer screenshots at 2am." },
  { name: "Festivals", tone: "#FFDE59", blurb: "Thousands of tickets, several gates, and a scanner that works on any phone." },
  { name: "Comedy shows", tone: "#9BE3C0", blurb: "Sell out the small room, then raise the price for the next one." },
  { name: "Conferences", tone: "#DDBBF5", blurb: "Hundreds of delegates and a door that has to move fast on the morning." },
  { name: "Workshops & classes", tone: "#FFC9A8", blurb: "Limit the seats so you never oversell a room you have to fit people into." },
  { name: "Church programmes", tone: "#9BE3C0", blurb: "Free entry, real tickets. Know your numbers before the doors open." },
  { name: "Weddings & owambe", tone: "#FFB3C7", blurb: "Invite-only, counted, and nobody turning up who wasn't asked." },
  { name: "Art exhibitions", tone: "#B7C4FF", blurb: "Timed entry slots, so the gallery never has more people than it can hold." },
  { name: "Film screenings", tone: "#DDBBF5", blurb: "One night, one room, a fixed number of seats. Sold out means sold out." },
  { name: "Food & drink", tone: "#FFC9A8", blurb: "Tastings, supper clubs, pop-up kitchens. Charge properly for a seat at the table." },
  { name: "Sports & fitness", tone: "#FFDE59", blurb: "Classes, tournaments, race entries. Take the money before they turn up." },
  { name: "Networking & meetups", tone: "#9BE3C0", blurb: "Free or paid, still ticketed — so you know who's in the room." },
  { name: "Tech & hackathons", tone: "#B7C4FF", blurb: "Free sign-ups at scale, with a real attendee list at the end of it." },
  { name: "Theatre", tone: "#FFB3C7", blurb: "A run of nights, each its own event, each with its own house." },
  { name: "Fundraisers", tone: "#DDBBF5", blurb: "Every naira raised goes to your bank, not into somebody's float." },
  { name: "Listening parties", tone: "#FFC9A8", blurb: "Small, intimate, and gone in an hour once you post the link." },
  { name: "Pop-up markets", tone: "#FFDE59", blurb: "Charge for stalls, entry, or both, and know your traders in advance." },
  { name: "Kids & family", tone: "#9BE3C0", blurb: "Parties, camps, holiday clubs. One ticket per child, counted at the gate." },
  { name: "Alumni & reunions", tone: "#B7C4FF", blurb: "A guest list you can actually check people against on the night." },
  { name: "Book & product launches", tone: "#FFB3C7", blurb: "Free RSVPs that still give you a scannable ticket and a real headcount." },
  { name: "Retreats", tone: "#DDBBF5", blurb: "High-value tickets where a percentage platform would have cost you a fortune." },
];
