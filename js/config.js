/* ------------------------------------------------------------------
   YOUR WEDDING DETAILS
   Everything on the invitation comes from this one file.
   Edit the text between the quotes, save, and refresh the page.
   ------------------------------------------------------------------ */
window.WEDDING = {
  /* The couple */
  partner1: "Anmol", // short names, shown large at the top
  partner2: "Rojina",
  partner1Full: "Anmol Acharya",
  partner2Full: "Rojina Tamang",
  initials: "A & R", // shown on the wax seal

  /* The date and start time of the wedding */
  date: "2026-12-13", // the same day on the English calendar: used for the countdown and Add to calendar
  nepaliDate: { year: 2083, month: "Mangsir", day: 27, daysInMonth: 29 }, // shown to guests and on the calendar
  time: "10:30", // 24-hour clock, when Holy Matrimony starts: used for the countdown and calendar
  utcOffset: "+05:45", // the time zone of the WEDDING venue, e.g. +05:45 for Nepal, +05:30 for India
  calendarHours: 4, // how long the event lasts in guests' calendars

  /* Cover page */
  coverLine: "Together with their families",
  defaultGuest: "Our dear guest", // used when the link has no guest name

  /* Invitation wording */
  invitationText: "With thankful hearts to God, we invite you to witness our Holy Matrimony",

  /* Bible verse shown under the couple's names. Swap it for your own choice:
     keep the wording exact and name the verse in the reference. */
  verseText: "“Therefore what God has joined together, let no one separate.”",
  verseReference: "Matthew 19:6",

  /* Both families */
  families: [
    { label: "Groom's parents", names: ["Rev. David Acharya", "Tulsi Acharya"] },
    { label: "Bride's parents", names: ["Rajendra Tamang", "Bimala Tamang"] },
  ],

  /* The one venue for the day: Holy Matrimony, with lunch at the same place.
     mapQuery: the venue name and address as you would type it into Google Maps.
     Pin checked against https://maps.app.goo.gl/JmBf4tTnwbHjFg1C6 */
  events: [
    {
      title: "Holy Matrimony",
      time: "10:30 AM",
      venue: "Beth Shalom Putalisadak Church",
      address: "Ramshah Path, Putalisadak, Kathmandu",
      mapQuery: "Beth Shalom Putalisadak Church, Ramshah Path, Putalisadak, Kathmandu",
    },
  ],

  /* Schedule. Icons available: rings, camera, toast, dinner, cake, music, heart */
  schedule: [
    { time: "10:00 AM", title: "Guests arrive and are seated", icon: "heart" },
    { time: "10:30 AM", title: "Holy Matrimony", icon: "rings" },
    { time: "11:45 AM", title: "Group photographs", icon: "camera" },
    { time: "1:00 PM", title: "Lunch is served", icon: "dinner" },
    { time: "2:00 PM", title: "Cutting of the cake", icon: "cake" },
  ],

  /* Photos. Put your pictures in assets/photos and list them here.
     coverPhoto: rises out of the envelope when it opens (5:4 landscape).
     heroPhoto: the tilted photo at the top of the page (4:5 portrait). */
  coverPhoto: "assets/photos/couple-landscape.png",
  heroPhoto: "assets/photos/couple-portrait.png",
  album: [
    "assets/photos/album-1.svg",
    "assets/photos/album-2.svg",
    "assets/photos/album-3.svg",
    "assets/photos/album-4.svg",
    "assets/photos/album-5.svg",
    "assets/photos/album-6.svg",
  ],

  /* Optional background music: put an .mp3 you have the rights to use in
     assets/music and write its path here. Leave empty for no music. */
  music: "assets/music/sanga-sangai-wedding-song.mp3",

  /* How loud the music gets after fading in, from 0.1 (very quiet) to 1 (full). */
  musicVolume: 0.4,

  /* How fast the page scrolls by itself while the music plays, in pixels per
     second. 30 is a slow reading pace. Use 0 to turn it off. */
  autoScrollSpeed: 30,

  /* Gift section. To remove it completely, change this to:  gift: null,
     qrImage: your QR code.
     Anyone with the link can see and save this QR code. */
  gift: {
    message:
      "We are thankful for your prayers and your presence. If you would also like to support the ceremony, you are welcome to do so here.",
    qrImage: "assets/art/gift-qr-code.jpeg",
  },

  closingText: "Your presence would be the greatest gift we could receive!",

  /* Bible verse at the very bottom of the page */
  closingVerseText: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
  closingVerseReference: "Psalm 118:24",

  /* Where the guest book and RSVP send their data: the server functions in api/.
     The database key stays on the server (see README.md). */
  databaseApi: "/api",
};
