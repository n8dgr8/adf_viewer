# Axis Analytics Data Format (`object_track.v1`) — Consumer Personas & Framing Guide

This guide organizes how to frame, position, and demonstrate Axis Analytics Data Format (**ADF `com.axis.scene.object_track.v1`**) across 8 distinct consumer audiences using the consolidated **3-View Developer Sandbox** built into **ADF Explorer** (`Inspector Workbench`, `Scene & Zone Sandbox`, and `Session & Attribute Explorer`) plus the global **`Strip Snapshots (Metadata-Only)`** toggle.

---

## Quick-Reference Matrix

| # | Consumer Persona | Core Pain Point | ADF Value Proposition ("The Aha!") | Key `object_track.v1` Fields | Primary App Views to Demo |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **BI / Operational Efficiency (OE) Developers** | Don't want RTSP video pipelines or cloud GPUs just to answer operational throughput and dwell questions. | **Camera as an IoT JSON sensor.** One MQTT track event delivers timestamps, dwell duration, path coordinates, and classifications ready for SQL, Kafka, or BI dashboards. | `id`, `channel_id`, `start_time`, `end_time`, `duration`, `classes[].type`, `classes[].score`, `path[]` | **Scene & Zone Sandbox** (Zone Geometry Export), **Inspector Workbench** (`JsonTreeView`) |
| **2** | **Security Developers ("NVR-Lite")** | 24/7 continuous video recording across sites saturates WAN links and burns terabytes of disk space on mostly empty scenes. | **Forensic awareness at <1% of video bandwidth.** Store compact JSON tracks + one best-shot JPEG (`image.data`) per object instead of continuous 1080p H.264 streams. | `image.data`, `image.crop_box`, `image.timestamp`, `classes[].colors`, `upper_clothing_colors`, `lower_clothing_colors` | **Session & Attribute Explorer**, **Inspector Workbench** (`BandwidthComparisonCard` & `SnapshotCard`) |
| **3** | **Non-Developers & Business Stakeholders** | Assume cameras only output raw video that humans must watch, or think scene AI requires expensive external servers. | **Look what the camera knows on the edge.** Out of the box, the camera classifies humans/vehicles/bikes, scores clothing/vehicle colors, tracks trajectories, and picks a best snapshot. | `classes[]`, `colors`, `upper_clothing_colors`, `lower_clothing_colors`, `path[]`, `image` | **Session & Attribute Explorer**, **Scene & Zone Sandbox** |
| **4** | **GDPR / Privacy-Conscious Developers** | Saving continuous video, faces, or plates triggers heavy retention, consent, DPIA, and right-to-erasure compliance risk. | **Anonymous spatial telemetry by design.** Enable **`Strip Snapshots (Metadata-Only)`** and ADF is pure normalized boxes (`[0..1]`), timestamps, and coarse classes—zero faces, plates, or biometric PII. | `path[].bounding_box`, `start_time`, `end_time`, `channel_id`, `classes[].type` *(with `image.data` stripped)* | Global **`Strip Snapshots`** toggle + **Scene & Zone Sandbox** + **Session & Attribute Explorer** (`Show Timeline Swimlanes`) |
| **5** | **Industrial EHS (Health & Safety) Engineers** | Need to detect vehicle–pedestrian near-misses, restricted-zone entries, and excessive speeds in warehouses or yards. | **Multi-object spatial + kinematic correlation.** Combine concurrent timeline overlap, instantaneous velocity curves, and ROI zones to flag unsafe co-presence. | `path[].timestamp`, `path[].bounding_box`, `classes[].type`, `start_time`, `end_time` | **Session & Attribute Explorer** (`Show Timeline Swimlanes`), **Inspector Workbench** (`TrackTelemetryCard`), **Scene & Zone Sandbox** |
| **6** | **Edge / Cloud FinOps & Remote IoT Architects** | Solar, LTE, or Starlink sites (construction, utilities, rail crossings) cannot stream continuous video over metered links. | **Extreme MQTT payload economics.** Metadata-only tracks are typically ~1–3 KB each (or ~10–20 KB with a snapshot)—ideal for low-bandwidth cellular telemetry. | Total JSON packet size (`metadataBytes` vs `snapshotBase64Bytes`) | Global **`Strip Snapshots`** toggle + **Inspector Workbench** (`BandwidthComparisonCard`) + **Session & Attribute Explorer** (`Show Session Summary`) |
| **7** | **Retail, Smart Building & Space Planners** | Need store/corridor foot-traffic heatmaps, directional splits, and end-cap dwell trends without manual counting. | **Turn cameras into spatial occupancy sensors.** Aggregate normalized footpoints into density heatmaps and directional compass roses across arbitrary zones. | `path[].bounding_box` (footpoint), `start_time`, `end_time`, `duration` | **Scene & Zone Sandbox** |
| **8** | **System Integrators & Field Sales Engineers** | Need to validate camera placement, perspective sizing, and model confidence during a site POC. | **Quantitative field-of-view diagnostics.** Inspect bounding-box area % growth, `H/W` aspect ratio shifts, and per-candidate confidence scores across the scene. | `path[].bounding_box`, `classes[].score`, `image.crop_box` | **Inspector Workbench** (`TrackTelemetryCard` & `TrackSceneCanvas`) |

---

## Core Consumer Personas

### 1. BI / Operational Efficiency (OE) Developers
* **Who they are:** Data engineers, backend developers, and analytics teams building dashboards in PowerBI, Grafana, BigQuery, Snowflake, or internal ERP/WMS systems.
* **What they care about:** Clean schemas, predictable event lifecycles, low ingestion cost, and deriving operational KPIs (turnaround times, bay utilization, queue lengths, traffic counts) without touching multimedia codecs.
* **Sample questions they ask:**
  * *"How many trucks vs. passenger cars entered Loading Zone B between 08:00 and 10:00?"*
  * *"What is the average dwell duration per object class across channels?"*
  * *"Can I prototype a spatial zone filter and copy the exact coordinates into my ingestion script?"*
* **How to demo with `adf-viewer`:**
  1. Open **Scene & Zone Sandbox** and draw an **ROI Box** or **Virtual Tripwire** (`A → B` vs `B → A`). Use **Copy JSON Geometry** or **Copy JS Filter Snippet** in the **Developer Zone Geometry** panel to show how easily normalized `[0..1]` coordinates translate into backend filtering code.
  2. Switch to **Session & Attribute Explorer** and click **Show Session Summary** to review class counts, top color distributions, and payload metrics across the captured batch.
  3. Jump to **Inspector Workbench** (`JsonTreeView`) to inspect the clean, self-contained `object_track.v1` JSON structure emitted over MQTT.

### 2. Security Developers ("NVR-Lite" Architects)
* **Who they are:** Developers building lightweight multi-site monitoring, alarm verification, patrol/dispatch tools, or low-bandwidth VMS/NVR alternatives.
* **What they care about:** Retaining visual forensic searchability (*"Find the person in a blue top"*, *"Show me white trucks from yesterday"*) while slashing storage, cloud egress, and network bandwidth.
* **Sample questions they ask:**
  * *"How much bandwidth do we save compared to streaming 1080p H.264/H.265/AV1 video?"*
  * *"Can operators still visually verify what triggered an event without pulling full video?"*
  * *"How fast can we filter captured events by vehicle or clothing color?"*
* **How to demo with `adf-viewer`:**
  1. Open **Session & Attribute Explorer** to demonstrate instant visual filtering by **Object Class**, **Color DNA Swatches** (`Object`, `Upper Clothing`, `Lower Clothing`), and **Minimum Confidence**, plus **Pin to Compare** (side-by-side comparison of up to 3 tracks) and the **Edge Recording Retrieval Window** (`Copy Clip Query JSON`).
  2. Click **Open in Workbench** on any track and expand **Bandwidth vs. Video Clip** (`BandwidthComparisonCard`) to compare the exact UTF-8 packet size (`JSON + Base64 JPEG`) against equivalent-duration `720p`, `1080p`, and `4K` clips in `AV1`, `H.265`, and `H.264`.
  3. Inspect **Best Snapshot (JPEG)** (`SnapshotCard`) for the camera-selected crop, capture timestamp, `crop_box`, and integer pixel magnification controls.

### 3. Non-Developers & Business Stakeholders
* **Who they are:** Product managers, operations directors, municipal leaders, facility managers, and executives who don't read JSON schemas.
* **What they care about:** Tangible business capabilities—understanding what modern edge cameras actually detect autonomously without extra servers or manual review.
* **Sample questions they ask:**
  * *"Does the camera already know the difference between a truck, a car, a bike, and a pedestrian?"*
  * *"Can it tell what color jacket someone was wearing?"*
  * *"What does an object's movement across the scene actually look like?"*
* **How to demo with `adf-viewer`:**
  1. Open **Session & Attribute Explorer**—zero JSON visible. Show snapshot cards, confidence meters, color pills (`Upper: blue 94%`, `Lower: gray 89%`), and mini SVG trajectory previews.
  2. Switch to **Scene & Zone Sandbox** with **Heatmap** and **Snapshots** enabled so stakeholders immediately see *where* objects moved and *what* they looked like overlaid on the scene.
  3. Click **+8 Sample Tracks** or toggle **Simulate Stream** so they see the sandbox update live as new detections arrive.

### 4. GDPR / Privacy-Conscious Developers
* **Who they are:** Security/privacy engineers, DPOs, European/regulated-market app teams, and compliance architects navigating GDPR, AI Act, or corporate privacy policies.
* **What they care about:** Data minimization, avoiding unintended PII collection (faces, license plates, bystanders), clear legal boundaries between anonymous analytics and identifiable video, and shortening retention risk.
* **Sample questions they ask:**
  * *"Can we collect traffic, occupancy, and flow analytics without storing images or personally identifiable information?"*
  * *"What happens to our analytics capabilities if we strip or disable the `image.data` snapshot payload?"*
  * *"If a genuine security incident does occur, how do we investigate it without keeping PII for every normal visitor?"*
* **How to demo with `adf-viewer`:**
  1. Toggle **`Strip Snapshots (Metadata-Only)`** ON in the view bar. Watch all snapshot JPEGs disappear across the app while the total session byte counter drops dramatically.
  2. Open **Scene & Zone Sandbox** and **Session & Attribute Explorer** (`Show Timeline Swimlanes` + `Show Session Summary`) to prove that **2D density heatmaps**, **tripwire directional counts**, **8-way compass roses**, **concurrent occupancy**, and **speed profiles** continue working 100% from normalized `[0..1]` bounding-box coordinates alone—zero faces, zero plates, zero video frames.
  3. Point to the **Edge Recording Retrieval Window** (`channel_id`, `start_time`, `end_time`) in **Inspector Workbench** (`TrackTelemetryCard`) or **Session & Attribute Explorer** to explain the on-demand PII pattern below.

---

## Additional Consumer Personas

### 5. Industrial EHS (Environment, Health & Safety) Engineers
* **Who they are:** Warehouse, manufacturing, logistics yard, and plant safety leads monitoring forklift/truck lanes, pedestrian walkways, and restricted hazard zones.
* **Why ADF fits:** Replaces passive CCTV review with quantifiable proximity, speed, and zone-entry telemetry.
* **How to demo with `adf-viewer`:**
  * In **Session & Attribute Explorer**, click **Show Timeline Swimlanes** to inspect the Gantt swimlanes and `Concurrent Scene` mini-map as multiple objects occupy the scene simultaneously.
  * In **Inspector Workbench**, check **Kinematics & Candidate Telemetry** (`TrackTelemetryCard`) to examine the **Instantaneous Speed** profile (`units/sec`).
  * In **Scene & Zone Sandbox**, draw an **ROI Box** over a loading bay or pedestrian crosswalk to isolate every track that entered it.

### 6. Edge / Cloud FinOps & Remote-Site IoT Architects
* **Who they are:** Infrastructure architects deploying cameras on LTE/5G, LoRa/backhaul-constrained links, or high-volume multi-branch cloud ingestion pipelines.
* **Why ADF fits:** Video streaming over cellular or cloud egress scales linearly in megabits per second; ADF event telemetry scales only with actual object activity in kilobytes per track.
* **How to demo with `adf-viewer`:**
  * Toggle **`Strip Snapshots (Metadata-Only)`** ON vs. OFF to demonstrate the immediate byte savings between full-snapshot packets and pure JSON metadata (`metadataBytes`).
  * Open **Session & Attribute Explorer → Show Session Summary** (`Payload Split` card) and **Inspector Workbench → Bandwidth vs. Video Clip** to quantify savings against `720p`/`1080p`/`4K` video codecs.

### 7. Retail, Smart Building & Space Planners
* **Who they are:** Store operations teams, corporate real-estate planners, campus managers, and smart-city traffic analysts.
* **Why ADF fits:** Delivers spatial utilization metrics (dwell, flow balance, corridor bottlenecks) without deploying dedicated LiDAR or floor-mat hardware.
* **How to demo with `adf-viewer`:**
  * Open **Scene & Zone Sandbox** with **Heatmap** + **8-Way Directional Flow Rose** to visualize high-traffic corridors and dominant movement headings (`E`, `SE`, `W`, etc.).
  * Draw a **Virtual Tripwire** across an entrance/aisle to measure `A → B` vs `B → A` directional splits.

### 8. System Integrators & Field Sales Engineers
* **Who they are:** Solutions architects, pre-sales engineers, and installers tuning camera angles, mounting heights, and analytics rules during POCs and commissioning.
* **Why ADF fits:** Turns subjective "looks good on screen" tuning into measurable bounding-box and confidence telemetry.
* **How to demo with `adf-viewer`:**
  * Open **Inspector Workbench** and check **Kinematics & Candidate Telemetry** (`BBox Area % & Aspect (H/W)`) to verify how large an object appears across its trajectory from entry to exit.
  * On **Scene Path Trajectory** (`TrackSceneCanvas`), enable **BBox Trail**, toggle **Anchor: Footpoint vs Center**, and upload a camera reference image via **Scene BG** to verify alignment against physical landmarks.

---

## Key Architectural Pattern for "NVR-Lite" & GDPR Personas: Metadata in the Cloud, Video at the Edge

When pitching **NVR-Lite** bandwidth/storage savings or **GDPR privacy minimization**, frame ADF not as a replacement for *all* video recording, but as the **lightweight central index** paired with **on-board camera edge recording** (e.g., encrypted SD card / edge storage on the Axis camera):

```
[Axis Camera (Edge)]
  ├── Continuous / Event Video ──▶ Stored locally on Camera SD Card (short rolling retention, access-controlled)
  └── ADF object_track.v1 JSON ──▶ Streamed via MQTT to Central DB / Dashboard (KB-scale, optionally image-free)
                                        │
                                        ▼
                        Operator flags incident / anomaly
                        using track { channel_id, start_time, end_time }
                                        │
                                        ▼
                Authorized pull of ONLY that exact [start_time .. end_time] clip
```

### Why This Framing Resonates with Both Audiences

1. **For NVR-Lite & FinOps Teams (Bandwidth & Disk Savings):**
   * You never pay to stream, transcode, or store 99% of uneventful footage in the cloud or across WAN links.
   * Central servers store years of searchable track telemetry (`~1–3 KB/track` metadata-only, or `~10–20 KB/track` with a best-shot JPEG).
   * When an actual incident requires full-frame video evidence, the application already has the exact `channel_id`, `start_time`, and `end_time` (shown in the **Edge Recording Retrieval Window** box) needed to fetch just that short clip from the camera's local recording.

2. **For GDPR & Privacy Teams (Need-to-Know PII Access):**
   * **Data Minimization by Default:** Everyday BI dashboards, heatmaps, and alerts run strictly on anonymous spatial telemetry (`bounding_box`, `timestamp`, `class`), so central databases never accumulate bystander faces or license plates.
   * **Just-in-Time, Audited PII Access:** Full video frames (potential PII) remain isolated at the edge with a short rolling TTL and are retrieved *only* when a verified safety/security trigger occurs—scoped tightly to the exact `[start_time, end_time]` window and subject to role-based access control and audit logging.
