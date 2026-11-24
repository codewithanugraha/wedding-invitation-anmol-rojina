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
  date: "2026-12-10", // the same day on the English calendar: used for the countdown and Add to calendar
  nepaliDate: { year: 2083, month: "Mangsir", day: 24, daysInMonth: 29 }, // shown to guests and on the calendar
  time: "12:00", // 24-hour clock, when the programme starts: used for the countdown and calendar
  utcOffset: "+05:45", // the time zone of the WEDDING venue, e.g. +05:45 for Nepal, +05:30 for India
  calendarHours: 4, // how long the event lasts in guests' calendars

  /* Cover page */
  coverLine: "Together with their families",

  /* Invitation wording */
  invitationText: "With thankful hearts to God, We invite you to witness the Holy Matrimony of",

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
      time: "12:00 PM",
      venue: "Beth Shalom Putalisadak Church",
      address: "Ramshah Path, Putalisadak, Kathmandu",
      mapQuery: "Beth Shalom Putalisadak Church, Ramshah Path, Putalisadak, Kathmandu",
      /* Parking is away from the church, so the section shows it beside the venue, and the
         map draws the walk from walkFrom (the church) to mapQuery (the parking pin).
         mapLink is what the parking's Directions link opens. Remove this block to show
         the venue alone. */
      parking: {
        name: "Near Neha Khaja Ghar",
        note: "3 min walk",
        walkFrom: "27.7001926,85.3215593",
        mapQuery: "27.698845,85.321277",
        mapLink: "https://maps.app.goo.gl/XpSAqcpAfBZ3dQNk7",
      },
    },
  ],

  /* Schedule, in order. Each item has a short title and an icon. Optional extras:
     note: "..." adds a line under the title, and  time: "12:30 PM"  shows times beside them.
     Icons: chair, entrance, cross, rings, bible, star, heart, candle, cake, camera, dinner,
     music, toast */
  schedule: [
    {
      title: "Bride and Groom's Entrance",
      note: "Please be seated by 12:00 PM",
      icon: "entrance",
    }, // guests seated first, then the couple's entrance, prayer and worship
    { title: "Holy Matrimony and Sermon", icon: "rings" },
    { title: "Performances and Thanksgiving", icon: "star" }, // talent show, dance, family thanks
    { title: "Blessing and Cake Cutting", icon: "cake" },
    { title: "Photos and Wedding Feast", icon: "dinner" },
  ],

  /* Photos. Put your pictures in assets/photos and list them here.
     coverPhoto: rises out of the envelope when it opens (5:4 landscape).
     heroPhoto: the tilted photo at the top of the page (4:5 portrait). */
  coverPhoto: "assets/photos/couple-landscape.png",
  heroPhoto: "assets/photos/couple-portrait.png",
  /* Engagement day, in order. Each is a 3:4 web copy (.webp) of the original .png in the
     same folder; the gallery cards are 3:4 too. */
  album: [
    "assets/photos/engagement/1.webp",
    "assets/photos/engagement/2.webp",
    "assets/photos/engagement/3.webp",
    "assets/photos/engagement/4.webp",
    "assets/photos/engagement/5.webp",
    "assets/photos/engagement/6.webp",
    "assets/photos/engagement/7.webp",
    "assets/photos/engagement/8.webp",
  ],

  /* Optional background music: put an .mp3 you have the rights to use in
     assets/music and write its path here. Leave empty for no music. */
  music: "assets/music/sanga-sangai-wedding-song.mp3",

  /* How loud the music gets after fading in. 0.18 stays gentle even with a phone
     on full volume. Raise it a little (0.25) if it feels too quiet. */
  musicVolume: 0.18,

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
