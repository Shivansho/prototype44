"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useWorldStore } from "@/store/useWorldStore";
import {
  Layers,
  MapPin,
  AlertTriangle,
  Building,
  Truck,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Flame,
  Globe2,
  Compass,
  Plus,
  Minus,
} from "lucide-react";
import { MapDisplayMode } from "../../../../../packages/shared-types";

// User's provided Mapbox API Token
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoianNhbWJoYXYiLCJhIjoiY211NWxpZjh0MDJhdTJ3czdhOHVoZmNzaCJ9.LVqTGSLBaee5wmHeovxU9g";

export const MapboxView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const {
    snapshot,
    layers,
    selectedIncident,
    selectedEntity,
    selectedAsset,
    mapDisplayMode,
    setMapDisplayMode,
    selectIncident,
    selectEntity,
    selectAsset,
    simulationResult,
    worldMode,
    currentDemoStep,
  } = useWorldStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [telemetry, setTelemetry] = useState({
    lat: 26.9124,
    lng: 75.7873,
    zoom: 13.5,
    pitch: 45,
  });

  // 1. Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const styleUrl =
      mapDisplayMode === "SATELLITE"
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/dark-v11";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [75.7873, 26.9124], // Jaipur Twin / Nexus City center
      zoom: 13.2,
      pitch: 42,
      bearing: -15,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add 3D building extrusion layer if on dark style
      if (mapDisplayMode === "2D_DARK" || mapDisplayMode === "HEATMAP") {
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === "symbol" && layer.layout && (layer.layout as any)["text-field"]
        )?.id;

        if (!map.getLayer("3d-buildings")) {
          map.addLayer(
            {
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 12,
              paint: {
                "fill-extrusion-color": "#1A2234",
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  12,
                  0,
                  15.05,
                  ["get", "height"],
                ],
                "fill-extrusion-base": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  12,
                  0,
                  15.05,
                  ["get", "min_height"],
                ],
                "fill-extrusion-opacity": 0.75,
              },
            },
            labelLayerId
          );
        }
      }

      // Add R17 Flooded Corridor Line & Area Layer
      if (!map.getSource("flood-corridor-r17")) {
        map.addSource("flood-corridor-r17", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: "Road R17 Severance", status: "BLOCKED" },
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [75.782, 26.920],
                    [75.789, 26.916],
                    [75.795, 26.913],
                    [75.801, 26.909],
                  ],
                },
              },
            ],
          },
        });

        // Glowing red stroke
        map.addLayer({
          id: "flood-r17-glow",
          type: "line",
          source: "flood-corridor-r17",
          paint: {
            "line-color": "#EF4444",
            "line-width": 8,
            "line-opacity": 0.4,
          },
        });

        map.addLayer({
          id: "flood-r17-core",
          type: "line",
          source: "flood-corridor-r17",
          paint: {
            "line-color": "#FF2E2E",
            "line-width": 3.5,
            "line-dasharray": [2, 1],
          },
        });
      }

      // Add Bypass Corridor Route (Road R14 Bypass)
      if (!map.getSource("bypass-corridor-r14")) {
        map.addSource("bypass-corridor-r14", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: "Corridor R14 Bypass", eta: "7.1m" },
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [75.775, 26.908],
                    [75.779, 26.914],
                    [75.783, 26.923],
                    [75.788, 26.928],
                    [75.792, 26.918], // Ingress to Memorial Hospital
                  ],
                },
              },
            ],
          },
        });

        map.addLayer({
          id: "bypass-r14-glow",
          type: "line",
          source: "bypass-corridor-r14",
          paint: {
            "line-color": "#06B6D4",
            "line-width": 7,
            "line-opacity": 0.35,
          },
        });

        map.addLayer({
          id: "bypass-r14-core",
          type: "line",
          source: "bypass-corridor-r14",
          paint: {
            "line-color": "#22D3EE",
            "line-width": 3,
          },
        });
      }
    });

    map.on("move", () => {
      const center = map.getCenter();
      setTelemetry({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapDisplayMode]);

  // 2. Sync Custom DOM Markers (Incidents, Hospitals, Assets)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !snapshot) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // A. Incidents (Alert halo beacons)
    if (layers.incidents) {
      snapshot.incidents.forEach((inc) => {
        const el = document.createElement("div");
        el.className = "group relative cursor-pointer";

        const isCritical = inc.severity === "CRITICAL" || inc.severity === "HIGH";
        const isSelected = selectedIncident?.id === inc.id;

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full ${
              isCritical ? "bg-red-500/30" : "bg-amber-500/30"
            } animate-ping"></span>
            <div class="w-6 h-6 rounded-full ${
              isCritical
                ? "bg-red-600 border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                : "bg-amber-500 border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.8)]"
            } flex items-center justify-center text-[10px] font-bold text-white">
              ⚠️
            </div>
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono font-bold text-white shadow-lg pointer-events-none ${
              isSelected ? "ring-2 ring-cyan-400" : ""
            }">
              #${inc.incidentNumber} ${inc.title.slice(0, 18)}...
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          selectIncident(inc);
          map.flyTo({ center: [inc.geometry.longitude, inc.geometry.latitude], zoom: 15, duration: 1200 });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([inc.geometry.longitude, inc.geometry.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // B. Facilities (Hospitals & Stations)
    if (layers.hospitals || layers.emergencyStations) {
      snapshot.entities.forEach((fac) => {
        if (fac.geometry?.type !== "Point") return;
        const isHosp = fac.entityType === "HOSPITAL";
        const isStation = fac.entityType === "EMERGENCY_STATION";

        if ((isHosp && !layers.hospitals) || (isStation && !layers.emergencyStations)) return;

        const el = document.createElement("div");
        el.className = "cursor-pointer group relative";

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-5 h-5 rounded-full ${
              isHosp ? "bg-emerald-600" : "bg-amber-600"
            } border-2 border-white shadow-md flex items-center justify-center text-[10px] text-white">
              ${isHosp ? "🏥" : "🛡️"}
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-mono font-semibold text-slate-200 pointer-events-none">
              ${fac.name.split(" ")[0]}
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          selectEntity(fac);
          map.flyTo({
            center: [fac.geometry.coordinates[0], fac.geometry.coordinates[1]],
            zoom: 15.5,
            duration: 1000,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([fac.geometry.coordinates[0], fac.geometry.coordinates[1]])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // C. Operational Assets (Ambulance / Rescue)
    if (layers.assets) {
      snapshot.assets.forEach((ast) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer";

        const isEngaged = ast.availability === "ENGAGED" || ast.availability === "DISPATCHED";

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 rounded-full ${
              isEngaged ? "bg-amber-400" : "bg-cyan-400"
            } border border-slate-950 shadow flex items-center justify-center text-[8px]">
              🚑
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          selectAsset(ast);
          map.flyTo({
            center: [ast.geometry.longitude, ast.geometry.latitude],
            zoom: 15.5,
            duration: 1000,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([ast.geometry.longitude, ast.geometry.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [snapshot, layers, selectedIncident, selectIncident, selectEntity, selectAsset]);

  // 3. Search Handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    const query = searchQuery.toLowerCase();

    // Check incident match
    const incMatch = snapshot?.incidents.find(
      (i) => i.title.toLowerCase().includes(query) || String(i.incidentNumber).includes(query)
    );
    if (incMatch) {
      selectIncident(incMatch);
      mapRef.current.flyTo({
        center: [incMatch.geometry.longitude, incMatch.geometry.latitude],
        zoom: 16,
        duration: 1200,
      });
      return;
    }

    // Check entity match
    const entMatch = snapshot?.entities.find((e) => e.name.toLowerCase().includes(query));
    if (entMatch && entMatch.geometry?.type === "Point") {
      selectEntity(entMatch);
      mapRef.current.flyTo({
        center: [entMatch.geometry.coordinates[0], entMatch.geometry.coordinates[1]],
        zoom: 16,
        duration: 1200,
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-space-950 overflow-hidden select-none">
      {/* Mapbox GL Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Controls Bar (CIVICPULSE Style) */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Map Style Switcher (Map, Satellite, 3D, Heatmap) */}
        <div className="pointer-events-auto flex items-center p-0.5 rounded-lg bg-surface-base/90 border border-surface-border backdrop-blur-md shadow-lg text-xs font-mono">
          <button
            onClick={() => setMapDisplayMode("2D_DARK")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              mapDisplayMode === "2D_DARK"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Map</span>
          </button>
          <button
            onClick={() => setMapDisplayMode("SATELLITE")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              mapDisplayMode === "SATELLITE"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Satellite</span>
          </button>
          <button
            onClick={() => setMapDisplayMode("3D_CESIUM")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              mapDisplayMode === "3D_CESIUM"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Living Twin</span>
          </button>
          <button
            onClick={() => setMapDisplayMode("HEATMAP")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              mapDisplayMode === "HEATMAP"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>Heatmap</span>
          </button>
        </div>

        {/* Center: Search Box */}
        <form
          onSubmit={handleSearch}
          className="pointer-events-auto flex-1 max-w-md relative hidden md:block"
        >
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location, ward, or incident ID (e.g. R17, Memorial Hospital)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-base/90 border border-surface-border text-xs font-mono text-slate-200 placeholder:text-slate-500 backdrop-blur-md focus:outline-none focus:border-blue-500 shadow-lg transition-colors"
          />
        </form>

        {/* Right: Quick Vantage Presets */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-surface-base/90 border border-surface-border backdrop-blur-md shadow-lg text-xs font-mono">
          <button
            onClick={() => {
              mapRef.current?.flyTo({ center: [75.7873, 26.9124], zoom: 12.5, pitch: 30, duration: 1500 });
            }}
            className="px-2 py-1 text-slate-300 hover:text-white rounded hover:bg-surface-elevated transition-colors"
          >
            Overview
          </button>
          <button
            onClick={() => {
              mapRef.current?.flyTo({ center: [75.792, 26.918], zoom: 15.5, pitch: 50, duration: 1200 });
            }}
            className="px-2 py-1 text-amber-300 hover:text-amber-200 rounded hover:bg-surface-elevated transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>R17 Flood</span>
          </button>
          <button
            onClick={() => {
              mapRef.current?.flyTo({ center: [75.792, 26.918], zoom: 16, pitch: 45, duration: 1200 });
            }}
            className="px-2 py-1 text-blue-300 hover:text-blue-200 rounded hover:bg-surface-elevated transition-colors flex items-center gap-1"
          >
            <Building className="w-3 h-3 text-blue-400" />
            <span>Hospital A</span>
          </button>
        </div>
      </div>

      {/* Floating Telemetry Box (Bottom Left - AEGIS Reference Style) */}
      <div className="absolute bottom-14 left-4 z-10 p-2.5 rounded-lg bg-surface-base/90 border border-surface-border backdrop-blur-md shadow-lg text-[10px] font-mono text-slate-300 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-100">
            {mapDisplayMode === "SATELLITE"
              ? "MAPBOX SATELLITE AERIAL"
              : mapDisplayMode === "2D_DARK"
              ? "MAPBOX VECTOR 2D DARK"
              : "H3 SPATIAL RISK ENGINE"}
          </span>
        </div>
        <div className="text-slate-400 flex items-center gap-3">
          <span>LAT: {telemetry.lat.toFixed(4)}°N</span>
          <span>LON: {telemetry.lng.toFixed(4)}°E</span>
          <span>ZOOM: {telemetry.zoom.toFixed(1)}</span>
        </div>
      </div>

      {/* Floating Mapbox Navigation Buttons (Right) */}
      <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 rounded-lg bg-surface-base/90 border border-surface-border hover:bg-surface-elevated text-slate-300 hover:text-white backdrop-blur shadow-lg transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 rounded-lg bg-surface-base/90 border border-surface-border hover:bg-surface-elevated text-slate-300 hover:text-white backdrop-blur shadow-lg transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            mapRef.current?.resetNorthPitch({ duration: 1000 });
          }}
          className="p-2 rounded-lg bg-surface-base/90 border border-surface-border hover:bg-surface-elevated text-slate-300 hover:text-white backdrop-blur shadow-lg transition-colors"
          title="Reset Orientation"
        >
          <Compass className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
};
