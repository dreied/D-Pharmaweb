// src/types/pharmacyLayout.js

export const DEFAULT_LAYOUT = {
  id: "default",
  cabinets: [
    {
      id: "cab1",
      x: 100,
      y: 80,
      width: 140,
      height: 300,
      label: "Cabinet 1",
      shelves: [
        {
          id: "s1",
          rows: 5,
        },
      ],
    },
  ],
};
