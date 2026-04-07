# GenTwin: Enterprise Production-Grade Theme & Aesthetics Guide

This guide outlines our project's visual identity, shifting from a conceptual hacker demo to a formal, production-grade cybersecurity and digital twin platform. It is designed to impress the hackathon judges by showcasing an application that looks ready for deployment in an enterprise Security Operations Center (SOC) or industrial control room.

## 🎨 1. Palette & Dark/Light Mode

Our application supports both Dark Mode and a strict Light Mode. It avoids gradients, box shadows, and neon colors completely to ensure a flat, analytical, and heavily professional appearance.

### Light Mode Colors
- **Background**: Flat white or extremely light gray (e.g., `#FFFFFF` / `#F8FAFC`).
- **Surface**: Pure white (`#FFFFFF`) for cards and panels.
- **Borders**: Always `0.5px solid #E2E8F0` on cards and layout boundaries.
- **Active/Interactive**: Blue **`#2563EB`**.
- **Critical / Threat**: Red **`#EF4444`**.
- **Warning / Alert**: Amber **`#F59E0B`**.
- **Stable / Success**: Green **`#10B981`**.

### Standard Constraints 
- NO gradients.
- NO box shadows.
- NO neon or hyper-saturated hues. 
- Colors are purely semantic.

## ✍️ 2. Typography

Clean, dense, and highly structured for displaying complex data arrays.

- **Primary Font**: `Inter` or standard `system-sans`.
- **Sizing Requirements**:
  - Main body / Data reads: `12px - 14px`.
  - Hero numbers / Key metrics: `28px`.
- **Font Weights**:
  - Body / Data labels: `400` (Regular). 
  - Headings / Data values: `500 - 600` (Medium/Semibold).
  - *Rule*: Never use bold for data labels. Only the values or headings should be prominent.

## 📐 3. Clean, Structured Layouts

We use flat, precise, data-dense grids.

- **Cards/Panels**: Flat backgrounds with `0.5px solid #E2E8F0` borders.
- **Corner Radius**: `8px - 10px` on all cards and major input elements.
- **Density**: Utilize space efficiently. Dashboards should mimic real SOCs, with side-by-side metric cards, data tables, and structured grids.

## 🛡️ 4. Layout Architecture

A standard enterprise B2B SaaS layout will enhance the perception of a production-ready product:

- **Left Sidebar**: Global navigation.
- **Top Bar**: Global context (Theme Toggle, Demo Mode Toggle).
- **Main Content Area**:
  - **KPI Header**: Row of metric cards.
  - **Data Grids**: Side-by-side panels detailing 'Attacker Telemetry' vs. 'True System Telemetry'.

## 📊 5. Hackathon Presentation Strategy

When pitching this as a formal enterprise product:
1. Show the flat, clean interface (use Light Mode to emphasize the B2B SaaS feel).
2. Use the Demo Mode toggle to initiate an attack or speed up simulations.
3. Show that the telemetry clearly highlights active threats (`#EF4444`) while true system readings maintain a stable green (`#10B981`) state.
