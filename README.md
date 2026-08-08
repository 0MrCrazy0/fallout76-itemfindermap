# Fallout 76 Item Finder Map

**Live version:** [https://0mrcrazy0.github.io/fallout76-itemfindermap/](https://0mrcrazy0.github.io/fallout76-itemfindermap/)

[![Version](https://img.shields.io/badge/version-76.Vault.Live-00ff00?style=flat-square&logo=github)](https://github.com/0MrCrazy0/fallout76-itemfindermap)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-blue?style=flat-square)](https://0mrcrazy0.github.io/fallout76-itemfindermap/)
[![Offline](https://img.shields.io/badge/offline-supported-brightgreen?style=flat-square)](https://0mrcrazy0.github.io/fallout76-itemfindermap/)

> A free, no-login browser tool for Fallout 76 players to mark and track items, locations, and discoveries across Appalachia.

**This is a free, fan-made tool for the Fallout 76 community.  
Not affiliated with Bethesda Softworks, ZeniMax Media, or Microsoft.**

---

## Features

- **Permanent Markers** — Right-click (PC) or long-press (mobile) anywhere on the map to log items. Markers are locked by default for safety and can be unlocked and dragged.
- **Temporary Postcards** — Create shareable temporary markers that expire after 5 minutes — perfect for coordinating with friends.
- **Powerful Search & Filter** — Search by description, category, or grid coordinate (e.g. `C4`).
- **Custom Categories** — Create, toggle, and delete your own categories with custom emojis.
- **Community Map** — Download verified markers submitted by other players. Submit your own discoveries for review.
- **Export / Import** — One-click backup and restore of your markers (Personal Only or Personal + Kept).
- **XP & Leveling System** — Earn XP for placing markers and level up like in the game.
- **Full Offline Support** — Works completely offline after the first load (ideal for areas with poor signal).
- **Progressive Web App (PWA)** — Installable for true fullscreen experience on mobile, desktop, and iOS.
- **Ultra-wide Screen Support** — Optimized for large and ultrawide displays.
- **Grid Overlay** — Toggle a 10×10 grid and view live grid coordinates.
- **Named / Clean Map Toggle** — Switch between the named map and a clean no-name version.
- **Marker Clustering** — Toggle clustering for better performance with large marker collections.
- **Voice Search** — Hands-free searching.
- **Sounds & Dark Mode** — Full audio feedback and dark mode support.
- **Save Map as JPEG** — Capture your current view with all visible markers.

---

## How to Use

1. Open the [live map](https://0mrcrazy0.github.io/fallout76-itemfindermap/).
2. **PC:** Right-click anywhere on the map.  
   **Mobile:** Long-press anywhere on the map.
3. Choose **Create Permanent Marker** or **Create Temporary Postcard**.
4. Use the search bar, category filters, and Tools panel to manage, organize, and explore your markers.

**Tip:** Newly created or moved markers glow green for 2 minutes as a visual indicator.

---

## FAQ

**Q: How do I create a marker?**  
A: Right-click (PC) or long-press (mobile) anywhere on the map and select “Create Permanent Marker”.

**Q: What is the difference between a permanent marker and a postcard?**  
A: Permanent markers stay on your map forever and can be moved, edited, or deleted. Postcards create a temporary shareable link that expires after 5 minutes — ideal for sharing with friends.

**Q: Why are some markers glowing green?**  
A: Newly created or recently moved markers glow for 2 minutes as a visual indicator.

**Q: How do I move a marker?**  
A: Tap the lock icon in the marker’s popup (or edit modal) to unlock it, drag it to the new location, and it will automatically re-lock when dropped.

**Q: How do I backup my markers?**  
A: Use the “Export Markers” button in the Tools panel. Choose “Personal Only” for a clean backup or “Personal + Kept” to include your edited community markers.

**Q: What does the Community Map do?**  
A: It adds verified markers submitted by other players. Tap **Update Community Map** regularly to receive the latest additions. You can also submit your own markers for review.

**Q: The app feels slow or broken.**  
A: Use the **Reset App** button in the How to Use menu, or uninstall the PWA and reinstall it for a clean start.

**Q: Is my data safe?**  
A: Yes. All your markers, XP, and settings are stored **locally on your device only**. Nothing is uploaded to any server except when you explicitly submit a marker to the community map.

**Q: Can I install this as an app?**  
A: Yes. On supported browsers (Chrome, Edge, Safari, etc.) you can install it as a Progressive Web App for a native-like fullscreen experience.

---

## Community Contributions

Players can submit markers to the Community Map. Submitted markers go through a review process before being merged.

- View pending submissions: [Pending Community Submissions](https://0mrcrazy0.github.io/fallout76-itemfindermap/pending.html)
- Markers are validated for duplicates, coordinate bounds, and description quality.

---

## Technical Notes

- Built with **Leaflet.js** + MarkerCluster
- Fully client-side (localStorage)
- Service Worker for offline caching of map images
- Responsive design with specific optimizations for iOS PWA, Android PWA, and ultrawide screens
- Custom category system and XP progression stored locally

---

## Disclaimer

This project is a **fan-made community tool**.

- Not affiliated with, endorsed by, or connected to Bethesda Softworks, ZeniMax Media, Microsoft, or any of their subsidiaries.
- Fallout, Fallout 76, and all related trademarks and assets are the property of their respective owners.
- Intended for personal, non-commercial use by the Fallout 76 community.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Credits

**Made with ❤️ by MrCrazy (0MrCrazy0)**  
For the Fallout 76 community.

Enjoy exploring Appalachia, Vault Dweller.  
*Ad Victoriam.*
