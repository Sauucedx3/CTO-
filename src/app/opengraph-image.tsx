import { ImageResponse } from "next/og";

/** Social preview card for the landing page (and every page that inherits it). */
export const alt =
  "ChangelogSync — public changelogs your customers will actually read";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#6366f1";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #ffffff 0%, #f4f4fb 55%, #e9e9fb 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: BRAND,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#0b0b12" }}>
            ChangelogSync
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#0b0b12",
              maxWidth: 900,
            }}
          >
            Public changelogs your customers will actually read
          </div>
          <div style={{ fontSize: 32, color: "#55556b", maxWidth: 900 }}>
            One clean, searchable timeline per product — free to start, no
            account for readers.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {["✨ New Features", "🐛 Bug Fixes", "⚡ Improvements"].map((label) => (
            <div
              key={label}
              style={{
                fontSize: 26,
                color: "#2f2f3d",
                background: "#ffffff",
                border: "1px solid #dcdcea",
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ fontSize: 26, color: BRAND, fontWeight: 600 }}>
            /c/your-product
          </div>
        </div>
      </div>
    ),
    size,
  );
}
