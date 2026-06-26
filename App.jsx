import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Trash2, Clock, Users, Search, Save, Share2, Download,
  ChevronDown, ChevronUp, X, Copy, Edit3, GripVertical, Filter,
  Coffee, Flag, ArrowLeft, FolderOpen, Library, LayoutGrid,
  CheckCircle2, AlertCircle, FileDown, UserPlus, Settings,
  Zap, Shield, Activity, Target, Wind, Dumbbell, Video, PlayCircle, Link2,
  CalendarRange, Sun, Snowflake, ListChecks, Shuffle, ToggleLeft, ToggleRight, Archive, ArchiveRestore, Route, UserCog, Mail
} from "lucide-react";
import { Store } from "./supabaseStore.js";

/* ---------------------------------------------------------------
   CONSTANTS / TAXONOMY (derived from real club drill database)
----------------------------------------------------------------*/

// 20 distinct squad identity colours — evenly spaced around the hue wheel,
// each kept clear of the app's reserved status hues (turf green, amber, blood red)
// so a squad's colour never reads as a contact-level or availability indicator.
const SQUAD_COLORS = [
  "#D1BE47", "#C3D147", "#A2D147", "#82D147", "#62D147",
  "#47D188", "#47D1A8", "#47D1C9", "#5FC6DD", "#5FA9DD",
  "#5F8BDD", "#5F6DDD", "#6E5FDD", "#8B5FDD", "#A95FDD",
  "#C75FDD", "#DD5FD5", "#D147A8", "#D14787", "#D14767",
];

const DEFAULT_PROGRAMS = [
  { key: "PRE_SEASON", label: "Pre season", icon: "Snowflake", color: "#2F8FD6" },
  { key: "IN_SEASON", label: "In season", icon: "Sun", color: "#3FA34D" },
  { key: "WRESTLE_CONTACT", label: "Wrestle & contact", icon: "Shield", color: "#C03B2B" },
  { key: "KICK_CATCH", label: "Kick catch", icon: "Target", color: "#E8A33D" },
];
const PROGRAM_ICONS = { Snowflake, Sun, Shield, Target, CalendarRange, Zap, Dumbbell, Activity, Wind };

const CATEGORIES = [
  { key: "PREP", label: "Prep", color: "#6b7280", icon: "Activity" },
  { key: "WARM_UP", label: "Warm up", color: "#3FA34D", icon: "Wind" },
  { key: "SKILL", label: "Skill", color: "#2F8FD6", icon: "Target" },
  { key: "TEAM", label: "Team / con game", color: "#9D5BD2", icon: "Users" },
  { key: "CONTACT", label: "Contact / defence", color: "#C03B2B", icon: "Shield" },
  { key: "CONDITIONING", label: "Conditioning", color: "#E8A33D", icon: "Dumbbell" },
  { key: "SPEED", label: "Speed / agility", color: "#1C9E8E", icon: "Zap" },
  { key: "PERF", label: "Performance / testing", color: "#7C8A99", icon: "Flag" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const SUBTYPES = ["Opposed", "Unopposed", "Attack", "Defence", "Team", "Catch & pass", "Contact", "Game", "Conditioning", "Warm up", "Test"];

const CONTACT_LEVELS = [
  { v: 0, label: "No contact", short: "—", color: "#5F5E5A" },
  { v: 1, label: "Light contact", short: "1", color: "#3FA34D" },
  { v: 2, label: "Moderate contact", short: "2", color: "#E8A33D" },
  { v: 3, label: "Full contact / live", short: "3", color: "#C03B2B" },
];

const SESSION_SIZES = ["Very light", "Light", "Light-medium", "Medium", "Medium-heavy", "Heavy", "Very heavy"];

const STARTER_DRILLS = [
  { type: "PREP", subtype: "Warm up", name: "Individual prep (indoor)", desc: "Self-directed mobility and activation before field work.", videoUrl: "", contact: 0 },
  { type: "PREP", subtype: "Warm up", name: "Prep to perform", desc: "Standardised pre-session movement prep routine.", videoUrl: "", contact: 0 },
  { type: "WARM_UP", subtype: "Warm up", name: "Physical warm up", desc: "Station-based: agility poles with catch, plyo, movement patterns.", videoUrl: "", contact: 0 },
  { type: "WARM_UP", subtype: "Contact", name: "Contact & wrestle", desc: "Low-intensity wrestle exposure to prime contact systems.", videoUrl: "", contact: 1 },
  { type: "WARM_UP", subtype: "Catch & pass", name: "Kick catch", desc: "Repetition high ball and grubber catching under fatigue-free conditions.", videoUrl: "", contact: 0 },
  { type: "WARM_UP", subtype: "Warm up", name: "Stride warm up", desc: "Progressive run-throughs at 80% and 90% max velocity.", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Opposed", name: "Goodball sets (opposed)", desc: "Live sets from a good-ball start position, fast reload under 30s.", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Tryline attack - last 2 plays (opposed)", desc: "Live reps of the final two attacking plays inside the tryline.", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Tryline D&A ladder", desc: "Progressive defend-and-attack ladder on the tryline, fast reload.", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Game", name: "13v13 scenarios", desc: "Full-team scenario play including field goal sets.", videoUrl: "", contact: 2 },
  { type: "TEAM", subtype: "Team", name: "Flow (2-6-6)", desc: "Continuous flow drill cycling forwards and backs through phases.", videoUrl: "", contact: 1 },
  { type: "TEAM", subtype: "Team", name: "13v13 - flow", desc: "Full-side continuous play emphasising start-of-game mentality.", videoUrl: "", contact: 2 },
  { type: "CONTACT", subtype: "Defence", name: "45 degree hit shield", desc: "Angled contact technique work on hit shields.", videoUrl: "", contact: 3 },
  { type: "CONTACT", subtype: "Contact", name: "Positional contact", desc: "Position-specific contact technique block.", videoUrl: "", contact: 3 },
  { type: "CONDITIONING", subtype: "Conditioning", name: "MAS grid 15/15 105/70%", desc: "Maximal aerobic speed interval grid, 15s on/15s off.", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "Test", name: "1.5km time trial", desc: "Linear time trial for aerobic benchmarking.", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "Warm up", name: "Box drill", desc: "Change of direction box pattern at building intensity.", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "Warm up", name: "Z-stride prep - out in", desc: "Lateral-to-linear stride mechanics progression.", videoUrl: "", contact: 0 },
  { type: "PERF", subtype: "Test", name: "1.2km time trial", desc: "Squad fitness benchmark time trial.", videoUrl: "", contact: 0 },
];
const IMPORTED_DRILLS_NRL = [
  { type: "CONDITIONING", subtype: "SHUTTLE", name: "240", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "SHUTTLE", name: "480", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "1 v 1 side tackle (crash mat)", desc: "", videoUrl: "", contact: 3 },
  { type: "CONDITIONING", subtype: "test", name: "1.5KTT", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "100m OB team ABC (pairs)", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Team", name: "13v13", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Opposed", name: "13v13 - 3 Plays", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Team", name: "13v13 - Flow", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Opposed", name: "13v13 - Scrum Starts", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "2 play attack S-S to L-S", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "2v1v1", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "2v3 create space + PTB", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "300's", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "3v2", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "4 defender held up", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "45 degree hit shield", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Defence", name: "45 degree tackle bag", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Conditioning", name: "Anaerobic shuttles", desc: "20-10-20-10-20 - roll through 10m, restart on 50 coming other way.", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "attacking play  2 play sequence unopposed", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Box Drill", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Bumpers PTB Tech", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Catch over head + loose ball recovery", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Catching", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Contact", name: "Contact & Wrestle", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "", name: "Contact Warm Up", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Opposed", name: "Deep Water Sets (Opposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Deep Water Sets (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Defending Arrow Shape (2 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Defending leads drill", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Defensive marker movements", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Defensive Movement Patterns (Hill)", desc: "", videoUrl: "", contact: 2 },
  { type: "CONDITIONING", subtype: "", name: "Dragon slayer", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Dummy half passing", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Edge D 100m", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Edge D 4v5", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Edge D&A", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Edge D&A (1 Play)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Edge D&A (1 Play) - 3 Edges", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Edge D&A (2 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Edge D&A (2 Plays) - 3 Edges", desc: "", videoUrl: "", contact: 2 },
  { type: "SPEED", subtype: "", name: "Express", desc: "", videoUrl: "", contact: 0 },
  { type: "TEAM", subtype: "Game", name: "Fill the space (11v9)", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Team", name: "Flow (2-6-6-2)", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Attack", name: "Funnel Drill - 20m", desc: "", videoUrl: "", contact: 0 },
  { type: "WARM_UP", subtype: "Warm up", name: "Game Day Warm Up", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Goodball & Tryline Retrieval (1 Play - Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Goodball 3 Play Sequence (Opposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Goodball D&A", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Kick Attack (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Middle Shapes (1 Play - v Pads)", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Set Clarity (Opposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Set Clarity (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Sets (Opposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Goodball Sets (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "CONDITIONING", subtype: "", name: "Heavy Bag Drill", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Conditioning", name: "Intermittent Con", desc: "30s/30s x 4", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Kick Catch", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Opposed", name: "Kick Chase Game", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Kick Defence (2 Plays) - Rapid Fire", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Kick defence Drill", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Kick Drill (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Kick Escort", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Kick Off Sets (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "", name: "Kicking (long)", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Team", name: "Last 2 - First 3", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Team", name: "Last 2 - Full Set", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Opposed", name: "Last 2 - Full Set + 6 Again", desc: "Ref calls 6 again so defensive team has to defend up to 2 sets continuously", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Last 2 Defence", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Linespeed v pads", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Marker D", desc: "", videoUrl: "", contact: 2 },
  { type: "CONDITIONING", subtype: "", name: "MAS GRIDS", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Micro Skill", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Middles Primary Shapes", desc: "", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "", name: "Movement", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "off sideline education shapes", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Offload Drill", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "Partner 200's", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Pendulum", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Pendulum + 1st 2 Plays", desc: "", videoUrl: "", contact: 0 },
  { type: "PERF", subtype: "", name: "Physical Warm Up", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Playing Down on Poles", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Positional Catch Pass", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Positional Contact", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Attack", name: "Positional Passing", desc: "", videoUrl: "", contact: 0 },
  { type: "PREP", subtype: "", name: "Prep to Perform", desc: "", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "", name: "Priming Circuits", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "PTB REC X 3 PLAYS", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "PUMA-arrow-slab", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "PUMA-SLAB-9 TIGER", desc: "", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "", name: "Repeat speed", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "Rolling Ruck", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Scrum D (2 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Set start to tackle 1,2", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Attack", name: "Sets (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Short & Long Shots (Opposed)", desc: "Plays to a shortside, alternating with a long side. Progress up field for reps", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Short & Long Shots (Unopposed)", desc: "Plays to a shortside, alternating with a long side. Progress up field for reps", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Shortside attack (5v4)", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Shortside D (1 Play)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Shortside D (2 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Shortside D (2 Plays) - 4v3", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Shortside D (2 Plays) continuous", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "", name: "Speed Agility", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "", name: "Static Catch Pass", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Warm up", name: "Stationary games", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Swing Gate", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Swing Gate & Lanes", desc: "", videoUrl: "", contact: 0 },
  { type: "TEAM", subtype: "", name: "Swingers Game", desc: "", videoUrl: "", contact: 1 },
  { type: "CONDITIONING", subtype: "", name: "Tackle Bag Drill", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "Attack", name: "Transition Attack - 2 Plays (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Transition Attack - 2 Plays (v Pads)", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Transition Attack - 3 Plays (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Transition Sets (Opposed)", desc: "Start with a kick retreat into a full Transition Set", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Tryline 3 Pt Kick", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Opposed", name: "Tryline Attack (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Tryline D&A", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Tryline D&A + 1", desc: "Full set on the tryline including the kick/turnover and 1st play in defence (Jump the Fence focus!)", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Tryline D&A (3 plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Tryline Marker Play Principles", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Up to Up Drill", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Up to Up Drill - 20m", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Up to Up Drill - hill", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "", name: "Waves", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Wide 4 Education Skill", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Yardage Transition Goodball (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "CONDITIONING", subtype: "", name: "YoMalKS", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "YoMalKS - Reverse", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "Conditioning", name: "Zip drill", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Team", name: "Tryline Defence", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Game", name: "10 Passes", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "40-40-20s", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Team", name: "skill education 50%", desc: "", videoUrl: "", contact: 1 },
  { type: "SKILL", subtype: "Opposed", name: "Goodball Sets (Opposed) - Scrum Starts", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "", name: "Positional Skill", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Tackle 4-5 Shift", desc: "", videoUrl: "", contact: 3 },
  { type: "SKILL", subtype: "", name: "Captains Run Warm Up", desc: "", videoUrl: "", contact: 0 },
  { type: "SPEED", subtype: "", name: "Stride Warm Up", desc: "", videoUrl: "", contact: 0 },
  { type: "CONDITIONING", subtype: "", name: "60m Returns", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Defending Wrap Sets", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Shift Defence (2 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Flow (2-6-6)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "Tryline Defence (Full Sets)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Game", name: "7v5 Game", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Defence", name: "Yardage D (4 Plays)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Drop Goal Sets (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "Tryline D&A Ladder", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Opposed", name: "13v13 - Scenarios", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Attack", name: "Last Play - First 3", desc: "", videoUrl: "", contact: 0 },
  { type: "SKILL", subtype: "Attack", name: "Last Plays Attack (Unopposed)", desc: "", videoUrl: "", contact: 2 },
  { type: "SKILL", subtype: "Defence", name: "SCRUM D", desc: "", videoUrl: "", contact: 2 },
];


const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function normalizeVideoUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function parseVideoMeta(raw) {
  const url = normalizeVideoUrl(raw);
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/shorts/")[1] || "";
      return { url, provider: "YouTube", thumb: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return { url, provider: "YouTube", thumb: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null };
    }
    if (host === "vimeo.com") {
      return { url, provider: "Vimeo", thumb: null };
    }
    if (host.includes("drive.google.com")) {
      return { url, provider: "Google Drive", thumb: null };
    }
    return { url, provider: host, thumb: null };
  } catch {
    return null;
  }
}

/* Parses pasted roster text into { name, position } rows.
   Handles: plain names (one per line), "Name, POS", "Name - POS",
   "Name\tPOS" (tab, e.g. pasted from a spreadsheet column), and
   "Surname, First" name formats left untouched. */
function parsePastedRoster(raw) {
  const lines = (raw || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const knownPositions = new Set(POSITIONS.map(p => p.toUpperCase()));
  const seen = new Set();
  const rows = [];

  for (const line of lines) {
    let name = line;
    let position = "";

    const cleaned = line.replace(/^\d+[\.\)]\s*/, "");

    if (cleaned.includes("\t")) {
      const parts = cleaned.split("\t").map(p => p.trim()).filter(Boolean);
      name = parts[0] || "";
      const maybePos = (parts[1] || "").toUpperCase();
      if (knownPositions.has(maybePos)) position = maybePos;
    } else if (cleaned.includes(",") && knownPositions.has(cleaned.split(",").pop().trim().toUpperCase()) && cleaned.split(",").length > 1) {
      const parts = cleaned.split(",");
      position = parts.pop().trim().toUpperCase();
      name = parts.join(",").trim();
    } else if (/\s-\s/.test(cleaned)) {
      const parts = cleaned.split(/\s-\s/);
      const maybePos = parts[parts.length - 1].trim().toUpperCase();
      if (knownPositions.has(maybePos)) {
        position = maybePos;
        name = parts.slice(0, -1).join(" - ").trim();
      }
    }

    name = name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ name, position });
  }
  return rows;
}

const fmtMin = (m) => {
  const n = Math.max(0, Math.round(Number(m) || 0));
  return `${n}'`;
};

/* Mon-Sun calendar week helpers, driven off session.date (YYYY-MM-DD) */
function toLocalDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon);
  return d;
}

function weekKeyFromDate(dateStr) {
  const start = getWeekStart(dateStr);
  if (!start) return null;
  return toLocalDateKey(start);
}

function fmtWeekRange(weekKey) {
  const start = new Date(weekKey + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { day: "numeric", month: "short" };
  const startStr = start.toLocaleDateString("en-AU", opts);
  const endStr = end.toLocaleDateString("en-AU", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function groupSessionsByWeek(sessionList) {
  const groups = {};
  const unscheduled = [];
  for (const s of sessionList) {
    const wk = s.date ? weekKeyFromDate(s.date) : null;
    if (!wk) { unscheduled.push(s); continue; }
    if (!groups[wk]) groups[wk] = [];
    groups[wk].push(s);
  }
  Object.values(groups).forEach(arr => arr.sort((a, b) => (a.date || "").localeCompare(b.date || "")));
  const weekKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return { weekKeys, groups, unscheduled };
}

/* ---------------------------------------------------------------
   STORAGE LAYER
----------------------------------------------------------------*/

// The Store object is implemented in supabaseStore.js — imported at
// the top of this file alongside the other module imports.

/* ---------------------------------------------------------------
   APP ROOT
----------------------------------------------------------------*/

export default function App() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [view, setView] = useState("home"); // home | programs | weeks | builder | library | sessions | squads | squad | focus | archived | archived-templates | plays | coaches
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      // getTeams() now returns exactly the squads Row Level Security
      // says the logged-in coach can see — an Admin sees every squad
      // at every club, an Owner sees every squad in their own club, a
      // regular coach sees only squads explicitly granted in the
      // Coaches tab. There's no first-run seeding here any more: real
      // squads get created deliberately, by an Admin or Owner, the
      // same way everything else in a real club gets set up.
      const t = await Store.getTeams();
      setTeams(t);
      if (t.length) setActiveTeamId(t[0].id);
      setLoading(false);
    })();
  }, []);

  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg, type = "ok") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const key = uid();
    setToast({ msg, type, key });
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const activeTeam = teams.find(t => t.id === activeTeamId) || null;

  const createTeam = async (name, color) => {
    const newTeam = await Store.createSquad(name, color);
    setTeams([...teams, newTeam]);
    setActiveTeamId(newTeam.id);
    showToast(`${name} created`);
  };

  const deleteTeam = async (id) => {
    await Store.deleteSquad(id);
    const next = teams.filter(t => t.id !== id);
    setTeams(next);
    if (activeTeamId === id) setActiveTeamId(next[0]?.id || null);
    showToast("Team removed");
  };

  const updateTeam = async (id, patch) => {
    await Store.updateSquad(id, patch);
    setTeams(teams.map(t => t.id === id ? { ...t, ...patch } : t));
    showToast("Squad updated");
  };

  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.loadingMark}>PlayPulse</div>
      </div>
    );
  }

  return (
    <div style={S.appShell}>
      <GlobalStyle />
      {!activeTeam ? (
        <TeamGate teams={teams} onCreate={createTeam} onSelect={setActiveTeamId} onDelete={deleteTeam} />
      ) : (
        <MainApp
          team={activeTeam}
          teams={teams}
          onSwitchTeam={setActiveTeamId}
          onCreateTeam={createTeam}
          onDeleteTeam={deleteTeam}
          onUpdateTeam={updateTeam}
          view={view}
          setView={setView}
          showToast={showToast}
        />
      )}
      {toast && (
        <div style={{ ...S.toast, borderColor: toast.type === "err" ? "#C03B2B" : "#3FA34D" }} key={toast.key}>
          {toast.type === "err" ? <AlertCircle size={16} color="#C03B2B" /> : <CheckCircle2 size={16} color="#3FA34D" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   TEAM GATE (first run / no teams / switch teams)
----------------------------------------------------------------*/

function TeamGate({ teams, onCreate, onSelect, onDelete }) {
  const [showNew, setShowNew] = useState(teams.length === 0);
  const [name, setName] = useState("");
  const colors = SQUAD_COLORS;
  const [color, setColor] = useState(colors[0]);

  return (
    <div style={S.gateWrap}>
      <div style={S.gateInner}>
        <div style={S.brandRow}>
          <PlayPulseLogo size={120} />
        </div>

        {teams.length > 0 && !showNew && (
          <>
            <div style={S.gateHeading}>Select a squad</div>
            <div style={S.teamGrid}>
              {teams.map(t => (
                <div key={t.id} style={S.teamCard} onClick={() => onSelect(t.id)}>
                  <div style={{ ...S.teamSwatch, background: t.color }} />
                  <div style={S.teamCardName}>{t.name}</div>
                  <button
                    style={S.teamCardDel}
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${t.name} and all its data?`)) onDelete(t.id); }}
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div style={S.teamCardNew} onClick={() => setShowNew(true)}>
                <Plus size={20} />
                <div>New squad</div>
              </div>
            </div>
          </>
        )}

        {showNew && (
          <div style={S.newTeamForm}>
            <div style={S.gateHeading}>{teams.length === 0 ? "Set up your first squad" : "New squad"}</div>
            <input
              style={S.input}
              placeholder="Squad name, e.g. Wests Tigers NRL"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <div style={S.colorRow}>
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ ...S.colorDot, background: c, outline: color === c ? "2px solid var(--chalk)" : "none" }}
                  aria-label={`Choose colour ${c}`}
                />
              ))}
            </div>
            <div style={S.gateActions}>
              {teams.length > 0 && (
                <button style={S.btnGhost} onClick={() => setShowNew(false)}>Cancel</button>
              )}
              <button
                style={S.btnPrimary}
                disabled={!name.trim()}
                onClick={() => { onCreate(name.trim(), color); setShowNew(false); setName(""); }}
              >
                Create squad
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN APP (after team selected)
----------------------------------------------------------------*/

function MainApp({ team, teams, onSwitchTeam, onCreateTeam, onDeleteTeam, onUpdateTeam, view, setView, showToast }) {
  const [drills, setDrills] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [templateList, setTemplateList] = useState([]);
  const [programs, setPrograms] = useState(DEFAULT_PROGRAMS);
  const [squad, setSquad] = useState([]);
  const [weekVisibility, setWeekVisibility] = useState({});
  const [focusBoard, setFocusBoard] = useState({ focusAreas: [], notes: [] });
  const [plays, setPlays] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const reload = useCallback(async () => {
    const [d, tl, sl, pr, sq, wv, fb, pl, co] = await Promise.all([
      Store.getDrillLibrary(),
      Store.getTemplateList(),
      Store.getSessionList(team.id),
      Store.getPrograms(team.id),
      Store.getSquad(team.id),
      Store.getWeekVisibility(team.id),
      Store.getFocusBoard(team.id),
      Store.getPlays(team.id),
      Store.getCoaches(),
    ]);
    setDrills(d || []);
    setTemplateList(tl || []);
    setSessionList(sl || []);
    setPrograms(pr && pr.length ? pr : DEFAULT_PROGRAMS);
    setSquad(sq || []);
    setWeekVisibility(wv || {});
    setFocusBoard(fb || { focusAreas: [], notes: [] });
    setPlays(pl || []);
    setCoaches(co || []);
  }, [team.id, teams]);

  useEffect(() => { reload(); }, [reload]);

  const persistDrills = async (next) => {
    setDrills(next);
    await Store.saveDrillLibrary(next);
  };

  const persistSessionList = async (next) => {
    setSessionList(next);
    await Store.saveSessionList(team.id, next);
  };

  const persistTemplateList = async (next) => {
    setTemplateList(next);
    await Store.saveTemplateList(next);
  };

  const archiveTemplate = async (id) => {
    const full = await Store.getTemplate(id);
    if (full) {
      await Store.saveTemplate({ ...full, archived: true, updated: Date.now() });
    }
    const next = templateList.map(t => t.id === id ? { ...t, archived: true, updated: Date.now() } : t);
    await persistTemplateList(next);
    showToast("Template archived — find it under Archived to restore");
  };

  const restoreTemplate = async (id) => {
    const full = await Store.getTemplate(id);
    if (full) {
      await Store.saveTemplate({ ...full, archived: false, updated: Date.now() });
    }
    const next = templateList.map(t => t.id === id ? { ...t, archived: false, updated: Date.now() } : t);
    await persistTemplateList(next);
    showToast("Template restored");
  };

  const persistPrograms = async (next) => {
    const saved = await Store.savePrograms(team.id, next);
    // Use the database's returned rows (with real ids) as the new source
    // of truth for local state, rather than `next` — this is what keeps a
    // freshly-created program's id in sync with what Postgres actually
    // assigned, so the next edit updates it instead of inserting a duplicate.
    setPrograms(saved && saved.length ? saved : next);
  };

  const addProgram = (newProgram) => {
    persistPrograms([...programs, newProgram]);
  };

  const updateProgram = (key, patch) => {
    persistPrograms(programs.map(p => p.key === key ? { ...p, ...patch } : p));
  };

  const persistSquad = async (next) => {
    setSquad(next);
    await Store.saveSquad(team.id, next);
  };

  const persistWeekVisibility = async (next) => {
    setWeekVisibility(next);
    await Store.saveWeekVisibility(team.id, next);
  };

  const persistFocusBoard = async (next) => {
    setFocusBoard(next);
    await Store.saveFocusBoard(team.id, next);
  };

  const persistPlays = async (next) => {
    setPlays(next);
    await Store.savePlays(team.id, next);
  };

  const inviteCoach = async (coach) => {
    const created = await Store.inviteCoach(coach);
    setCoaches([...coaches, created]);
  };

  const updateCoach = async (coach) => {
    await Store.updateCoach(coach);
    setCoaches(coaches.map(c => c.id === coach.id ? coach : c));
  };

  const removeCoach = async (coachId) => {
    await Store.removeCoach(coachId);
    setCoaches(coaches.filter(c => c.id !== coachId));
  };

  const toggleSessionInWeek = (weekKey, sessionId) => {
    // weekKey is accepted for backward compatibility with existing call
    // sites, but no longer used: a session only ever belongs to one
    // week (computed from its own date), so visibility only needs to be
    // keyed by sessionId — which is exactly how week_visibility is
    // shaped in the database (squad_id, session_id), with no separate
    // week_key column at all.
    const next = { ...weekVisibility, [sessionId]: weekVisibility[sessionId] === false ? true : false };
    persistWeekVisibility(next);
  };

  const assignSessionToWeek = async (id, { date, day, program }) => {
    const full = await Store.getSession(team.id, id);
    if (!full) return;
    const updatedFull = { ...full, date, day: day || full.day, program: program || full.program, updated: Date.now() };
    await Store.saveSession(team.id, updatedFull);
    const next = sessionList.map(s => s.id === id ? { ...s, date, day: updatedFull.day, program: updatedFull.program, updated: updatedFull.updated } : s);
    await persistSessionList(next);
    showToast("Added to week");
  };

  const archiveSession = async (id) => {
    const full = await Store.getSession(team.id, id);
    if (full) {
      await Store.saveSession(team.id, { ...full, archived: true, updated: Date.now() });
    }
    const next = sessionList.map(s => s.id === id ? { ...s, archived: true, updated: Date.now() } : s);
    await persistSessionList(next);
    showToast("Session archived — find it under Archived to restore");
  };

  const restoreSession = async (id) => {
    const full = await Store.getSession(team.id, id);
    if (full) {
      await Store.saveSession(team.id, { ...full, archived: false, updated: Date.now() });
    }
    const next = sessionList.map(s => s.id === id ? { ...s, archived: false, updated: Date.now() } : s);
    await persistSessionList(next);
    showToast("Session restored");
  };

  // Copy a template from the shared library into THIS squad's own sessions.
  const copyTemplateIntoSquad = async (templateId, programKey) => {
    const tmpl = await Store.getTemplate(templateId);
    if (!tmpl) return null;
    const newId = uid();
    const newSession = {
      ...tmpl,
      id: newId,
      program: programKey || (programs[0] && programs[0].key),
      created: Date.now(),
      updated: Date.now(),
    };
    await Store.saveSession(team.id, newSession);
    const meta = templateList.find(t => t.id === templateId);
    const newMeta = { ...meta, id: newId, program: newSession.program, updated: newSession.updated, created: newSession.created };
    await persistSessionList([newMeta, ...sessionList]);
    showToast(`"${tmpl.name}" copied into ${team.name}`);
    return newId;
  };

  // Copy a template into several OTHER squads at once — writes straight to each
  // target squad's own storage, independent of whatever squad is currently active.
  const bulkCopyTemplateToSquads = async (templateId, squadTargets) => {
    const tmpl = await Store.getTemplate(templateId);
    if (!tmpl) return;
    const meta = templateList.find(t => t.id === templateId);

    await Promise.all(squadTargets.map(async (target) => {
      const [targetPrograms, targetSessionList] = await Promise.all([
        Store.getPrograms(target.id),
        Store.getSessionList(target.id),
      ]);
      const programList = targetPrograms && targetPrograms.length ? targetPrograms : DEFAULT_PROGRAMS;
      const newId = uid();
      const newSession = {
        ...tmpl,
        id: newId,
        program: programList[0] && programList[0].key,
        created: Date.now(),
        updated: Date.now(),
      };
      await Store.saveSession(target.id, newSession);
      const newMeta = { ...meta, id: newId, program: newSession.program, updated: newSession.updated, created: newSession.created };
      await Store.saveSessionList(target.id, [newMeta, ...(targetSessionList || [])]);
      // Keep this squad's own view in sync if it happens to be the active one.
      if (target.id === team.id) {
        setSessionList([newMeta, ...sessionList]);
      }
    }));

    showToast(`"${tmpl.name}" copied into ${squadTargets.length} squad${squadTargets.length === 1 ? "" : "s"}`);
  };

  // Publish one of this squad's sessions as a reusable template for every squad.
  const saveSessionAsTemplate = async (sessionId, freshFull, freshMeta) => {
    const full = freshFull || await Store.getSession(team.id, sessionId);
    if (!full) { showToast("Couldn't find that session to save as a template", "err"); return; }
    const newId = uid();
    const { program, date, day, weekCode, ...rest } = full;
    const template = { ...rest, id: newId, created: Date.now(), updated: Date.now() };
    await Store.saveTemplate(template);
    const baseMeta = freshMeta || { name: full.name, totalMins: full.totalMins, blockCount: full.blockCount };
    const newMeta = { ...baseMeta, id: newId, updated: template.updated, created: template.created, date: undefined, day: undefined, program: undefined };
    await persistTemplateList([newMeta, ...templateList]);
    showToast("Saved as a template for every squad");
  };

  const activeSessions = sessionList.filter(s => !s.archived);
  const archivedSessions = sessionList.filter(s => s.archived);
  const activeTemplates = templateList.filter(t => !t.archived);
  const archivedTemplates = templateList.filter(t => t.archived);

  const openSession = (id) => { setActiveSessionId(id); setView("builder"); };
  const newSession = (program) => { setActiveSessionId(null); setSelectedProgram(program || selectedProgram); setView("builder"); };
  const enterProgram = (key) => { setSelectedProgram(key); setView("weeks"); };
  const exitProgram = () => { setSelectedProgram(null); setView("programs"); };

  return (
    <div style={S.mainShell}>
      <header style={S.topBar}>
        <div style={S.topBarLeft}>
          <button style={S.iconBtn} onClick={() => setView("home")} aria-label="Home">
            <PlayPulseLogo size={28} />
          </button>
          <div style={S.crumbDivider} />
          <div style={S.teamPicker} onClick={() => setShowTeamMenu(v => !v)}>
            <div style={{ ...S.teamDotSm, background: team.color }} />
            <span style={S.teamPickerName}>{team.name}</span>
            <ChevronDown size={14} />
            {showTeamMenu && (
              <div style={S.teamMenu} onMouseLeave={() => setShowTeamMenu(false)}>
                {teams.map(t => (
                  <div key={t.id} style={S.teamMenuItem} onClick={() => { onSwitchTeam(t.id); setShowTeamMenu(false); setView("home"); }}>
                    <div style={{ ...S.teamDotSm, background: t.color }} />
                    {t.name}
                  </div>
                ))}
                <div style={{ ...S.teamMenuItem, color: "var(--turf)" }} onClick={() => { onCreateTeam("New squad " + (teams.length + 1), "#3FA34D"); setShowTeamMenu(false); }}>
                  <Plus size={14} /> New squad
                </div>
              </div>
            )}
          </div>
        </div>
        <nav style={S.topNav}>
          <NavBtn active={view === "programs" || view === "weeks"} onClick={() => setView("programs")} icon={<CalendarRange size={15} />} label="Programs" />
          <NavBtn active={view === "plays"} onClick={() => setView("plays")} icon={<Route size={15} />} label="Plays" />
          <NavBtn active={view === "focus"} onClick={() => setView("focus")} icon={<Target size={15} />} label="Focus & Notes" />
          <NavBtn active={view === "sessions"} onClick={() => setView("sessions")} icon={<FolderOpen size={15} />} label="Session Library" />
          <NavBtn active={view === "library"} onClick={() => setView("library")} icon={<Library size={15} />} label="Drill Library" />
          <NavBtn active={view === "squads" || view === "squad"} onClick={() => setView("squads")} icon={<Users size={15} />} label="Squads" />
          <NavBtn active={view === "coaches"} onClick={() => setView("coaches")} icon={<UserCog size={15} />} label="Coaches" />
        </nav>
        <button style={S.btnPrimarySm} onClick={newSession}>
          <Plus size={15} /> New session
        </button>
      </header>

      <main style={S.mainBody}>
        {view === "home" && (
          <HomeView
            team={team}
            sessionList={activeSessions}
            drillCount={drills.length}
            squadCount={squad.length}
            onOpenSession={openSession}
            onNewSession={newSession}
            onGoto={setView}
          />
        )}
        {view === "programs" && (
          <ProgramsView programs={programs} sessionList={activeSessions} onSelectProgram={enterProgram} onAddProgram={addProgram} onUpdateProgram={updateProgram} />
        )}
        {view === "weeks" && (
          <WeeksView
            team={team}
            programs={programs}
            program={selectedProgram}
            sessionList={selectedProgram ? activeSessions.filter(s => (s.program || (programs[0] && programs[0].key)) === selectedProgram) : activeSessions}
            templateList={templateList}
            weekVisibility={weekVisibility}
            onToggleSession={toggleSessionInWeek}
            onOpenSession={openSession}
            onNewSession={() => newSession(selectedProgram)}
            onAssignToWeek={assignSessionToWeek}
            onArchiveSession={archiveSession}
            onCopyTemplate={(templateId) => copyTemplateIntoSquad(templateId, selectedProgram).then(newId => newId && openSession(newId))}
            onBack={selectedProgram ? exitProgram : null}
            onViewArchived={() => setView("archived")}
            archivedCount={archivedSessions.length}
          />
        )}
        {view === "archived" && (
          <ArchivedSessionsView
            team={team}
            archivedSessions={archivedSessions}
            onRestore={restoreSession}
            onOpenSession={openSession}
            onBack={() => setView("weeks")}
          />
        )}
        {view === "sessions" && (
          <TemplateLibraryView
            team={team}
            teams={teams}
            templateList={activeTemplates}
            programs={programs}
            onNew={newSession}
            onArchive={archiveTemplate}
            onCopyIntoSquad={async (templateId, programKey) => {
              const newId = await copyTemplateIntoSquad(templateId, programKey);
              if (newId) openSession(newId);
            }}
            onBulkCopyToSquads={bulkCopyTemplateToSquads}
            onViewArchived={() => setView("archived-templates")}
            archivedCount={archivedTemplates.length}
          />
        )}
        {view === "archived-templates" && (
          <ArchivedTemplatesView
            templateList={archivedTemplates}
            onRestore={restoreTemplate}
            onBack={() => setView("sessions")}
          />
        )}
        {view === "library" && (
          <LibraryView drills={drills} onChange={persistDrills} showToast={showToast} />
        )}
        {view === "squads" && (
          <SquadsView
            teams={teams}
            activeTeamId={team.id}
            onSwitchTeam={(id) => { onSwitchTeam(id); setView("home"); }}
            onCreateTeam={onCreateTeam}
            onDeleteTeam={onDeleteTeam}
            onUpdateTeam={onUpdateTeam}
            onOpenRoster={() => setView("squad")}
          />
        )}
        {view === "squad" && (
          <SquadView squad={squad} onChange={persistSquad} showToast={showToast} onBack={() => setView("squads")} />
        )}
        {view === "focus" && (
          <FocusView team={team} board={focusBoard} onChange={persistFocusBoard} showToast={showToast} />
        )}
        {view === "plays" && (
          <PlaysView team={team} plays={plays} onChange={persistPlays} showToast={showToast} />
        )}
        {view === "coaches" && (
          <CoachesView teams={teams} coaches={coaches} onInvite={inviteCoach} onUpdate={updateCoach} onRemove={removeCoach} showToast={showToast} />
        )}
        {view === "builder" && (
          <BuilderView
            team={team}
            sessionId={activeSessionId}
            drills={drills}
            squad={squad}
            plays={plays}
            defaultProgram={selectedProgram}
            programs={programs}
            onDrillsChange={persistDrills}
            onSaved={async (meta) => {
              const exists = sessionList.find(s => s.id === meta.id);
              const next = exists
                ? sessionList.map(s => s.id === meta.id ? meta : s)
                : [meta, ...sessionList];
              await persistSessionList(next);
              setActiveSessionId(meta.id);
              showToast("Session saved");
            }}
            onSaveAsTemplate={saveSessionAsTemplate}
            onBack={() => setView(selectedProgram ? "weeks" : "sessions")}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button style={{ ...S.navBtn, ...(active ? S.navBtnActive : {}) }} onClick={onClick}>
      {icon} {label}
    </button>
  );
}

/* ---------------------------------------------------------------
   HOME VIEW
----------------------------------------------------------------*/

function HomeView({ team, sessionList, drillCount, squadCount, onOpenSession, onNewSession, onGoto }) {
  const recent = [...sessionList].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 4);
  const totalMins = sessionList.reduce((a, s) => a + (s.totalMins || 0), 0);

  return (
    <div style={S.homeWrap}>
      <div style={S.homeHero}>
        <div style={S.homeHeroLabel}>This week's whiteboard</div>
        <h1 style={S.homeHeroTitle}>{team.name}</h1>
        <div style={S.homeStatRow}>
          <Stat label="Sessions saved" value={sessionList.length} />
          <Stat label="Drills in library" value={drillCount} />
          <Stat label="Squad size" value={squadCount} />
          <Stat label="Total mins planned" value={totalMins} />
        </div>
        <button style={S.btnPrimary} onClick={onNewSession}>
          <Plus size={16} /> Build a new session
        </button>
      </div>

      <div style={S.homeCols}>
        <div style={S.homeCol}>
          <div style={S.sectionHeadRow}>
            <h2 style={S.sectionHead}>Recent sessions</h2>
            <button style={S.linkBtn} onClick={() => onGoto("sessions")}>View all</button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Flag size={22} />}
              title="No sessions yet"
              body="Build your first session and it'll show up here, ready to reopen or duplicate for next week."
              actionLabel="New session"
              onAction={onNewSession}
            />
          ) : (
            <div style={S.sessionMiniList}>
              {recent.map(s => (
                <div key={s.id} style={S.sessionMiniCard} onClick={() => onOpenSession(s.id)}>
                  <div style={{ ...S.sessionMiniBar, background: CATEGORY_MAP[s.weekCode ? "TEAM" : "SKILL"]?.color || "#3FA34D" }} />
                  <div style={S.sessionMiniBody}>
                    <div style={S.sessionMiniTitle}>{s.name || "Untitled session"}</div>
                    <div style={S.sessionMiniMeta}>
                      {s.day || "—"} · {fmtMin(s.totalMins)} · {s.blockCount || 0} blocks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S.homeCol}>
          <h2 style={S.sectionHead}>Quick actions</h2>
          <div style={S.quickGrid}>
            <QuickCard icon={<CalendarRange size={18} />} title="Programs" body="Pre season or in season \u2014 weeks, compare side by side" onClick={() => onGoto("programs")} />
            <QuickCard icon={<Route size={18} />} title="Plays" body="Draw and save set plays for this squad" onClick={() => onGoto("plays")} />
            <QuickCard icon={<Target size={18} />} title="Focus & Notes" body="Track focus areas and log dated coaching notes" onClick={() => onGoto("focus")} />
            <QuickCard icon={<Library size={18} />} title="Drill Library" body="Browse, search, and add club drills" onClick={() => onGoto("library")} />
            <QuickCard icon={<Users size={18} />} title="Squads" body="Switch squads, manage rosters and availability" onClick={() => onGoto("squads")} />
            <QuickCard icon={<UserCog size={18} />} title="Coaches" body="Manage the coaching roster and squad access" onClick={() => onGoto("coaches")} />
            <QuickCard icon={<FolderOpen size={18} />} title="Session Library" body="Reopen, duplicate, or export past plans" onClick={() => onGoto("sessions")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.statBox}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function QuickCard({ icon, title, body, onClick }) {
  return (
    <div style={S.quickCard} onClick={onClick}>
      <div style={S.quickCardIcon}>{icon}</div>
      <div>
        <div style={S.quickCardTitle}>{title}</div>
        <div style={S.quickCardBody}>{body}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, body, actionLabel, onAction }) {
  return (
    <div style={S.emptyState}>
      <div style={S.emptyIcon}>{icon}</div>
      <div style={S.emptyTitle}>{title}</div>
      <div style={S.emptyBody}>{body}</div>
      {actionLabel && <button style={S.btnGhost} onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

/* ---------------------------------------------------------------
   SESSIONS LIST VIEW
----------------------------------------------------------------*/

function ProgramsView({ programs, sessionList, onSelectProgram, onAddProgram, onUpdateProgram }) {
  const colorChoices = ["#2F8FD6", "#3FA34D", "#C03B2B", "#E8A33D", "#9D5BD2", "#1C9E8E"];
  const [editingProgram, setEditingProgram] = useState(null); // "new" | program object | null
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorChoices[0]);

  const counts = useMemo(() => {
    const m = {};
    programs.forEach(p => { m[p.key] = { count: 0, mins: 0 }; });
    sessionList.forEach(s => {
      const key = s.program || (programs[0] && programs[0].key);
      if (!key) return;
      if (!m[key]) m[key] = { count: 0, mins: 0 };
      m[key].count += 1;
      m[key].mins += s.totalMins || 0;
    });
    return m;
  }, [sessionList, programs]);

  const openNew = () => { setEditingProgram("new"); setName(""); setColor(colorChoices[0]); };
  const openEdit = (p) => { setEditingProgram(p); setName(p.label); setColor(p.color); };
  const closeModal = () => setEditingProgram(null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingProgram === "new") {
      onAddProgram({ key: "P_" + uid(), label: name.trim(), icon: "CalendarRange", color });
    } else {
      onUpdateProgram(editingProgram.key, { label: name.trim(), color });
    }
    closeModal();
  };

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Programs</h1>
          <div style={S.pageSub}>Pick a program to see its weeks and sessions</div>
        </div>
        <button style={S.btnGhost} onClick={openNew}><Plus size={15} /> New program</button>
      </div>

      <div style={S.programGrid}>
        {programs.map(p => {
          const Icon = PROGRAM_ICONS[p.icon] || CalendarRange;
          const c = counts[p.key] || { count: 0, mins: 0 };
          return (
            <div key={p.key} style={{ ...S.programCard, borderColor: p.color + "55" }} onClick={() => onSelectProgram(p.key)}>
              <div style={S.programCardTopRow}>
                <div style={{ ...S.programCardIcon, background: p.color + "1A", color: p.color }}>
                  <Icon size={22} />
                </div>
                <button
                  style={S.iconBtnGhost}
                  onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                  aria-label={`Edit ${p.label}`}
                >
                  <Edit3 size={13} />
                </button>
              </div>
              <div style={S.programCardTitle}>{p.label}</div>
              <div style={S.programCardMeta}>{c.count} session{c.count === 1 ? "" : "s"} · {fmtMin(c.mins)} planned</div>
            </div>
          );
        })}
      </div>

      {editingProgram && (
        <div style={S.modalOverlay} onClick={closeModal}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeadRow}>
              <h3 style={S.modalTitle}>{editingProgram === "new" ? "New program" : "Edit program"}</h3>
              <button style={S.iconBtnGhost} onClick={closeModal} aria-label="Close"><X size={16} /></button>
            </div>
            <label style={S.fieldLabel}>Program name</label>
            <input style={S.input} placeholder="e.g. Finals prep" value={name} onChange={e => setName(e.target.value)} autoFocus />
            <label style={S.fieldLabel}>Colour</label>
            <div style={S.colorRow}>
              {colorChoices.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ ...S.colorDot, background: c, outline: color === c ? "2px solid var(--chalk)" : "none" }} aria-label={`Choose colour ${c}`} />
              ))}
            </div>
            <div style={S.modalActions}>
              <button style={S.btnGhost} onClick={closeModal}>Cancel</button>
              <button style={S.btnPrimary} disabled={!name.trim()} onClick={handleSubmit}>
                {editingProgram === "new" ? "Create program" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeksView({ team, programs, sessionList, templateList, weekVisibility, onToggleSession, onOpenSession, onNewSession, onCopyTemplate, onArchiveSession, onBack, program, onViewArchived, archivedCount }) {
  const { weekKeys, groups, unscheduled } = useMemo(() => groupSessionsByWeek(sessionList), [sessionList]);
  const [compareWeek, setCompareWeek] = useState(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const programInfo = program ? programs.find(p => p.key === program) : null;

  const handlePickTemplate = (templateMeta) => {
    setShowLibraryPicker(false);
    onCopyTemplate(templateMeta.id);
  };

  const archivedLink = (
    <button style={S.btnGhost} onClick={onViewArchived}>
      <FolderOpen size={15} /> Archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
    </button>
  );

  if (sessionList.length === 0) {
    return (
      <div style={S.pageWrap}>
        {onBack && <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Programs</button>}
        <div style={S.pageHeadRow}>
          <div>
            <h1 style={S.pageTitle}>{programInfo ? programInfo.label : "Weeks"}</h1>
            <div style={S.pageSub}>{team.name} · sessions grouped by the week they're scheduled for</div>
          </div>
          <div style={S.pageHeadActions}>
            {archivedLink}
            <button style={S.btnGhost} onClick={() => setShowLibraryPicker(true)}><Library size={15} /> Copy from templates</button>
            <button style={S.btnPrimary} onClick={onNewSession}><Plus size={16} /> New session</button>
          </div>
        </div>
        <EmptyState
          icon={<LayoutGrid size={22} />}
          title="No sessions scheduled yet"
          body="Give a session a date and it'll automatically land in its Mon–Sun week here, or copy a starting point from the template library."
          actionLabel="New session"
          onAction={onNewSession}
        />
      </div>
    );
  }

  return (
    <div style={S.pageWrap}>
      {onBack && <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Programs</button>}
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>{programInfo ? programInfo.label : "Weeks"}</h1>
          <div style={S.pageSub}>{team.name} · sessions grouped Mon–Sun by their session date</div>
        </div>
        <div style={S.pageHeadActions}>
          {archivedLink}
          <button style={S.btnGhost} onClick={() => setShowLibraryPicker(true)}><Library size={15} /> Copy from templates</button>
          <button style={S.btnPrimary} onClick={onNewSession}><Plus size={16} /> New session</button>
        </div>
      </div>

      <div style={S.weeksList}>
        {weekKeys.map(wk => (
          <WeekCard
            key={wk}
            weekKey={wk}
            sessions={groups[wk]}
            visibility={weekVisibility}
            onToggleSession={(sid) => onToggleSession(wk, sid)}
            onOpenSession={onOpenSession}
            onArchiveSession={onArchiveSession}
            onCompare={() => setCompareWeek(wk)}
          />
        ))}

        {unscheduled.length > 0 && (
          <div style={S.weekCard}>
            <div style={S.weekCardHead}>
              <div>
                <div style={S.weekCardTitle}>Unscheduled</div>
                <div style={S.weekCardSub}>{unscheduled.length} session{unscheduled.length === 1 ? "" : "s"} without a date</div>
              </div>
            </div>
            <div style={S.weekSessionList}>
              {unscheduled.map(s => (
                <div key={s.id} style={S.weekSessionRow}>
                  <div style={S.weekSessionMain} onClick={() => onOpenSession(s.id)}>
                    <span style={S.weekSessionName}>{s.name || "Untitled session"}</span>
                    <span style={S.weekSessionMeta}>{fmtMin(s.totalMins)} · {s.blockCount || 0} blocks</span>
                  </div>
                  <button
                    style={S.iconBtnGhost}
                    onClick={() => { if (confirm(`Archive "${s.name || "this session"}"? You can restore it any time from Archived.`)) onArchiveSession(s.id); }}
                    aria-label="Archive"
                    title="Archive"
                  >
                    <Archive size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {compareWeek && (
        <WeekCompareModal
          team={team}
          weekKey={compareWeek}
          sessions={(groups[compareWeek] || []).filter(s => weekVisibility[s.id] !== false)}
          onClose={() => setCompareWeek(null)}
          onOpenSession={onOpenSession}
        />
      )}

      {showLibraryPicker && (
        <LibrarySessionPickerModal
          sessionList={templateList || []}
          onPick={handlePickTemplate}
          onClose={() => setShowLibraryPicker(false)}
          title="Copy a template"
          pickLabel="copy into this squad"
        />
      )}
    </div>
  );
}

function WeekCard({ weekKey, sessions, visibility, onToggleSession, onOpenSession, onArchiveSession, onCompare }) {
  const [expanded, setExpanded] = useState(true);
  const visibleSessions = sessions.filter(s => visibility[s.id] !== false);
  const totalMins = visibleSessions.reduce((a, s) => a + (s.totalMins || 0), 0);
  const isCurrentWeek = weekKey === weekKeyFromDate(toLocalDateKey(new Date()));

  return (
    <div style={S.weekCard}>
      <div style={S.weekCardHead}>
        <button style={S.weekCardHeadBtn} onClick={() => setExpanded(v => !v)}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          <div>
            <div style={S.weekCardTitle}>
              {fmtWeekRange(weekKey)}
              {isCurrentWeek && <span style={S.weekCurrentBadge}>This week</span>}
            </div>
            <div style={S.weekCardSub}>
              {visibleSessions.length} of {sessions.length} visible · {fmtMin(totalMins)} planned
            </div>
          </div>
        </button>
        {visibleSessions.length >= 2 && (
          <button style={S.btnGhost} onClick={onCompare}><LayoutGrid size={13} /> Compare side by side</button>
        )}
      </div>

      {expanded && (
        <div style={S.weekSessionList}>
          {sessions.map(s => {
            const visible = visibility[s.id] !== false;
            return (
              <div key={s.id} style={{ ...S.weekSessionRow, opacity: visible ? 1 : 0.45 }}>
                <button
                  style={S.weekSessionToggle}
                  onClick={() => onToggleSession(s.id)}
                  aria-label={visible ? "Hide from this week" : "Show in this week"}
                  title={visible ? "Showing in this week" : "Hidden from this week"}
                >
                  {visible ? <CheckCircle2 size={16} color="var(--turf)" /> : <div style={S.weekSessionToggleOff} />}
                </button>
                <div style={S.weekSessionMain} onClick={() => onOpenSession(s.id)}>
                  <span style={S.weekSessionName}>{s.name || "Untitled session"}</span>
                  <span style={S.weekSessionMeta}>
                    {s.day ? s.day + " · " : ""}{fmtMin(s.totalMins)} · {s.blockCount || 0} blocks
                  </span>
                </div>
                <button
                  style={S.iconBtnGhost}
                  onClick={() => { if (confirm(`Archive "${s.name || "this session"}"? You can restore it any time from Archived.`)) onArchiveSession(s.id); }}
                  aria-label="Archive"
                  title="Archive"
                >
                  <Archive size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekCompareModal({ team, weekKey, sessions, onClose, onOpenSession }) {
  const [fullSessions, setFullSessions] = useState(null);

  useEffect(() => {
    (async () => {
      const loaded = await Promise.all(sessions.map(s => Store.getSession(team.id, s.id)));
      setFullSessions(loaded.filter(Boolean));
    })();
  }, [sessions, team.id]);

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.compareModalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>{fmtWeekRange(weekKey)} — side by side</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {!fullSessions ? (
          <div style={S.loadingInline}>Loading sessions…</div>
        ) : (
          <div style={S.compareGrid}>
            {fullSessions.map(s => (
              <div key={s.id} style={S.compareCol}>
                <button style={S.compareColHead} onClick={() => onOpenSession(s.id)}>
                  <div style={S.compareColTitle}>{s.name || "Untitled session"}</div>
                  <div style={S.compareColMeta}>{s.day || ""} {s.date ? `· ${s.date}` : ""} · {fmtMin(s.totalMins)}</div>
                </button>
                <div style={S.compareColBlocks}>
                  {s.blocks.map(b => b.isBreak ? (
                    <div key={b.id} style={S.compareBreak}><Coffee size={11} /> {b.label}</div>
                  ) : (
                    <div key={b.id} style={{ ...S.compareBlock, borderLeftColor: CATEGORY_MAP[b.category]?.color || "#888" }}>
                      <div style={S.compareBlockTop}>
                        <span style={S.compareBlockTime}>{fmtMin(b.drillTime)}</span>
                        {!!b.contact && (
                          <span style={{ ...S.compareContactDot, background: CONTACT_LEVELS[b.contact]?.color }} title={CONTACT_LEVELS[b.contact]?.label} />
                        )}
                      </div>
                      <div style={S.compareBlockName}>{b.drillName || "Untitled drill"}</div>
                    </div>
                  ))}
                  {s.blocks.length === 0 && <div style={S.summaryEmptyNote}>No blocks added yet.</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArchivedSessionsView({ team, archivedSessions, onRestore, onOpenSession, onBack }) {
  const [query, setQuery] = useState("");
  const sorted = [...archivedSessions].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const filtered = sorted.filter(s => (s.name || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={S.pageWrap}>
      <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Weeks</button>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Archived</h1>
          <div style={S.pageSub}>{team.name} · {archivedSessions.length} archived session{archivedSessions.length === 1 ? "" : "s"} — restore any time</div>
        </div>
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search archived sessions…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Archive size={22} />}
          title={query ? "No matches" : "Nothing archived"}
          body={query ? "Try a different search term." : "Sessions you archive from a week will show up here, ready to restore."}
        />
      ) : (
        <div style={S.sessionGrid}>
          {filtered.map(s => (
            <div key={s.id} style={S.sessionCard}>
              <div style={S.sessionCardTop} onClick={() => onOpenSession(s.id)}>
                <div style={S.sessionCardTitle}>{s.name || "Untitled session"}</div>
                <div style={S.sessionCardMetaRow}>
                  <MetaPill icon={<Clock size={12} />} text={fmtMin(s.totalMins)} />
                  <MetaPill icon={<LayoutGrid size={12} />} text={`${s.blockCount || 0} blocks`} />
                  {s.day && <MetaPill icon={<Flag size={12} />} text={s.day} />}
                </div>
              </div>
              <div style={S.sessionCardActions}>
                <button style={S.btnGhostXs} onClick={() => onRestore(s.id)}>
                  <ArchiveRestore size={12} /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedTemplatesView({ templateList, onRestore, onBack }) {
  const [query, setQuery] = useState("");
  const sorted = [...templateList].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const filtered = sorted.filter(s => (s.name || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={S.pageWrap}>
      <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Session Library</button>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Archived Templates</h1>
          <div style={S.pageSub}>{templateList.length} archived template{templateList.length === 1 ? "" : "s"} — restore any time</div>
        </div>
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search archived templates…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Archive size={22} />}
          title={query ? "No matches" : "Nothing archived"}
          body={query ? "Try a different search term." : "Templates you archive from the Session Library will show up here, ready to restore."}
        />
      ) : (
        <div style={S.sessionGrid}>
          {filtered.map(s => (
            <div key={s.id} style={S.sessionCard}>
              <div style={S.sessionCardTop}>
                <div style={S.sessionCardTitle}>{s.name || "Untitled session"}</div>
                <div style={S.sessionCardMetaRow}>
                  <MetaPill icon={<Clock size={12} />} text={fmtMin(s.totalMins)} />
                  <MetaPill icon={<LayoutGrid size={12} />} text={`${s.blockCount || 0} blocks`} />
                </div>
              </div>
              <div style={S.sessionCardActions}>
                <button style={S.btnGhostXs} onClick={() => onRestore(s.id)}>
                  <ArchiveRestore size={12} /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibrarySessionPickerModal({ sessionList, onPick, onClose, title, pickLabel }) {
  const [query, setQuery] = useState("");

  const filtered = [...sessionList]
    .filter(s => (s.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>{title || "Choose from session library"}</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={S.searchRow}>
          <Search size={15} color="var(--text-secondary)" />
          <input autoFocus style={S.searchInput} placeholder="Search templates…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div style={S.pickerList}>
          {filtered.map(s => (
            <div key={s.id} style={S.pickerRow} onClick={() => onPick(s)}>
              <span style={S.pickerDot} />
              <div style={{ flex: 1 }}>
                <div style={S.pickerName}>{s.name || "Untitled session"}</div>
                <div style={S.pickerDesc}>
                  {fmtMin(s.totalMins)} · {s.blockCount || 0} blocks{pickLabel ? ` · click to ${pickLabel}` : ""}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={S.summaryEmptyNote}>{query ? "No templates match that search." : "No templates saved yet."}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateLibraryView({ team, teams, templateList, programs, onNew, onArchive, onCopyIntoSquad, onBulkCopyToSquads, onViewArchived, archivedCount }) {
  const [query, setQuery] = useState("");
  const [copyingId, setCopyingId] = useState(null);
  const [bulkCopyingId, setBulkCopyingId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const sorted = [...templateList].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const filtered = sorted.filter(s => (s.name || "").toLowerCase().includes(query.toLowerCase()));
  const bulkCopyingTemplate = templateList.find(s => s.id === bulkCopyingId);
  const previewTemplate = templateList.find(s => s.id === previewId);

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Session Library</h1>
          <div style={S.pageSub}>{templateList.length} templates · shared across every squad to copy and customise</div>
        </div>
        <div style={S.pageHeadActions}>
          <button style={S.btnGhost} onClick={onViewArchived}>
            <FolderOpen size={15} /> Archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
          </button>
          <button style={S.btnPrimary} onClick={onNew}><Plus size={16} /> New session</button>
        </div>
      </div>

      <div style={S.bulkHint}>
        Templates are starting points only — copying one into {team.name} creates an independent session that's yours to edit. Build a session in your own Programs tab, then use "Save as template" to share it back here for other coaches.
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search templates by name…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} />}
          title={query ? "No matches" : "No templates yet"}
          body={query ? "Try a different search term." : "Build a session in your Programs tab, then save it as a template to start the library."}
          actionLabel={query ? null : "New session"}
          onAction={onNew}
        />
      ) : (
        <div style={S.sessionGrid}>
          {filtered.map(s => (
            <div key={s.id} style={S.sessionCard}>
              <div style={S.sessionCardTop} onClick={() => setPreviewId(s.id)}>
                <div style={S.sessionCardTitle}>{s.name || "Untitled session"}</div>
                <div style={S.sessionCardMetaRow}>
                  <MetaPill icon={<Clock size={12} />} text={fmtMin(s.totalMins)} />
                  <MetaPill icon={<LayoutGrid size={12} />} text={`${s.blockCount || 0} blocks`} />
                </div>
                {s.theme && <div style={S.sessionCardTheme}>{s.theme}</div>}
              </div>
              <div style={S.sessionCardActions}>
                <button style={S.btnGhostXs} onClick={() => setCopyingId(copyingId === s.id ? null : s.id)}>
                  <Copy size={12} /> Copy into {team.name}
                </button>
                <button style={S.iconBtnGhost} onClick={() => setBulkCopyingId(s.id)} aria-label="Copy to squads" title="Copy to multiple squads"><Users size={14} /></button>
                <button
                  style={S.iconBtnGhost}
                  onClick={() => { if (confirm(`Archive "${s.name || "this template"}"? You can restore it any time from Archived.`)) onArchive(s.id); }}
                  aria-label="Archive"
                  title="Archive"
                >
                  <Archive size={14} />
                </button>
              </div>
              {copyingId === s.id && (
                <CopyToProgramPopover
                  programs={programs}
                  onPick={(programKey) => { onCopyIntoSquad(s.id, programKey); setCopyingId(null); }}
                  onClose={() => setCopyingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {previewTemplate && (
        <TemplatePreviewModal
          teamName={team.name}
          templateMeta={previewTemplate}
          programs={programs}
          onClose={() => setPreviewId(null)}
          onCopyIntoSquad={(templateId, programKey) => { onCopyIntoSquad(templateId, programKey); setPreviewId(null); }}
          onBulkCopy={() => { setBulkCopyingId(previewTemplate.id); setPreviewId(null); }}
        />
      )}

      {bulkCopyingId && bulkCopyingTemplate && (
        <BulkCopyModal
          session={bulkCopyingTemplate}
          teams={teams || []}
          mode="template"
          onConfirm={(targets) => {
            onBulkCopyToSquads(bulkCopyingId, targets);
            setBulkCopyingId(null);
          }}
          onClose={() => setBulkCopyingId(null)}
        />
      )}
    </div>
  );
}

function AssignWeekPopover({ session, onAssign, onClose }) {
  const [date, setDate] = useState(session.date || "");
  const [day, setDay] = useState(session.day || "");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div style={S.assignPopover} ref={ref} onClick={e => e.stopPropagation()}>
      <div style={S.assignPopoverTitle}>Add to week</div>
      <FieldSm label="Date">
        <input type="date" style={S.selectSm} value={date} onChange={e => setDate(e.target.value)} autoFocus />
      </FieldSm>
      <FieldSm label="Day">
        <select style={S.selectSm} value={day} onChange={e => setDay(e.target.value)}>
          <option value="">—</option>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </FieldSm>
      {date && <div style={S.assignPopoverPreview}>Will land in: {fmtWeekRange(weekKeyFromDate(date))}</div>}
      <div style={S.modalActions}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btnPrimary} disabled={!date} onClick={() => onAssign({ date, day })}>Add to week</button>
      </div>
    </div>
  );
}

function CopyToProgramPopover({ programs, onPick, onClose, anchorStyle }) {
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div style={anchorStyle || S.assignPopover} ref={ref} onClick={e => e.stopPropagation()}>
      <div style={S.assignPopoverTitle}>Copy to program</div>
      <div style={S.copyProgramList}>
        {programs.map(p => {
          const Icon = PROGRAM_ICONS[p.icon] || CalendarRange;
          return (
            <button key={p.key} style={S.copyProgramRow} onClick={() => onPick(p.key)}>
              <span style={{ ...S.copyProgramIcon, background: p.color + "1A", color: p.color }}>
                <Icon size={13} />
              </span>
              <span style={S.copyProgramLabel}>{p.label}</span>
            </button>
          );
        })}
        {programs.length === 0 && <div style={S.summaryEmptyNote}>No programs set up for this squad yet.</div>}
      </div>
      <div style={S.modalActions}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function BulkCopyModal({ session, teams, mode, onConfirm, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const isTemplate = mode === "template";

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(teams.map(t => t.id)));
  const selectNone = () => setSelected(new Set());

  const targets = teams.filter(t => selected.has(t.id));

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>Copy to squads</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={S.bulkCopySourceName}>"{session.name || "Untitled session"}"</div>
        <div style={S.bulkHint}>
          {isTemplate
            ? "Each ticked squad gets its own independent copy of this template, ready for that squad's coaches to schedule and edit — none of the copies are linked to each other or to this template."
            : "Each ticked squad gets its own independent copy, named with the squad added on — editing one copy won't affect the others or the original."}
        </div>

        <div style={S.bulkCopyHeadRow}>
          <span style={S.bulkCopyHeadLabel}>Squads</span>
          <span style={S.bulkCopyHeadActions}>
            <button style={S.linkBtn} onClick={selectAll}>Select all</button>
            <span style={S.bulkCopyHeadDivider}>·</span>
            <button style={S.linkBtn} onClick={selectNone}>Clear</button>
          </span>
        </div>

        <div style={S.bulkCopyList}>
          {teams.map(t => {
            const checked = selected.has(t.id);
            return (
              <button key={t.id} style={S.bulkCopyRow} onClick={() => toggle(t.id)}>
                {checked ? <CheckCircle2 size={16} color="var(--turf)" /> : <div style={S.weekSessionToggleOff} />}
                <span style={{ ...S.teamDotSm, background: t.color }} />
                <span style={S.bulkCopyRowName}>{t.name}</span>
                <span style={S.bulkCopyRowPreview}>{isTemplate ? `${session.name} → ${t.name}'s programs` : `${session.name} (${t.name})`}</span>
              </button>
            );
          })}
          {teams.length === 0 && <div style={S.summaryEmptyNote}>No squads set up yet.</div>}
        </div>

        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} disabled={targets.length === 0} onClick={() => onConfirm(targets)}>
            Copy to {targets.length} squad{targets.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaPill({ icon, text }) {
  return <span style={S.metaPill}>{icon}{text}</span>;
}

function TemplatePreviewModal({ teamName, templateMeta, programs, onClose, onCopyIntoSquad, onBulkCopy }) {
  const [full, setFull] = useState(null);
  const [showCopyPicker, setShowCopyPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await Store.getTemplate(templateMeta.id);
      setFull(data);
    })();
  }, [templateMeta.id]);

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.previewModalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <div>
            <h3 style={S.modalTitle}>{templateMeta.name || "Untitled session"}</h3>
            {full && (full.theme || full.content) && (
              <div style={S.previewSubline}>{[full.theme, full.content].filter(Boolean).join(" · ")}</div>
            )}
          </div>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {!full ? (
          <div style={S.loadingInline}>Loading session…</div>
        ) : (
          <>
            <div style={S.previewStatsRow}>
              <MetaPill icon={<Clock size={12} />} text={fmtMin(templateMeta.totalMins)} />
              <MetaPill icon={<LayoutGrid size={12} />} text={`${templateMeta.blockCount || 0} blocks`} />
              {full.sessionSize && <MetaPill icon={<Activity size={12} />} text={full.sessionSize} />}
            </div>

            <div style={S.previewBlockList}>
              {full.blocks.map(b => b.isBreak ? (
                <div key={b.id} style={S.compareBreak}><Coffee size={12} /> {b.label}</div>
              ) : (
                <div key={b.id} style={{ ...S.previewBlockRow, borderLeftColor: CATEGORY_MAP[b.category]?.color || "#888" }}>
                  <div style={S.previewBlockHeadRow}>
                    <span style={{ ...S.previewBlockCat, color: CATEGORY_MAP[b.category]?.color }}>{CATEGORY_MAP[b.category]?.label}</span>
                    <span style={S.previewBlockTime}>{fmtMin(b.drillTime)}</span>
                    {!!b.contact && (
                      <span style={{ ...S.compareContactDot, background: CONTACT_LEVELS[b.contact]?.color }} title={CONTACT_LEVELS[b.contact]?.label} />
                    )}
                  </div>
                  <div style={S.previewBlockName}>{b.drillName || "Untitled drill"}</div>
                  {b.focus && <div style={S.previewBlockNotes}>{b.focus}</div>}
                </div>
              ))}
              {full.blocks.length === 0 && <div style={S.summaryEmptyNote}>No blocks added yet.</div>}
            </div>
          </>
        )}

        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onBulkCopy}><Users size={13} /> Copy to squads</button>
          <button style={S.btnPrimary} onClick={() => setShowCopyPicker(v => !v)}>
            <Copy size={13} /> Copy into {teamName}
          </button>
        </div>

        {showCopyPicker && (
          <CopyToProgramPopover
            programs={programs}
            onPick={(programKey) => { onCopyIntoSquad(templateMeta.id, programKey); setShowCopyPicker(false); }}
            onClose={() => setShowCopyPicker(false)}
            anchorStyle={S.previewCopyPickerAnchor}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   DRILL LIBRARY VIEW
----------------------------------------------------------------*/

function LibraryView({ drills, onChange, showToast }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [editing, setEditing] = useState(null); // drill object or "new"

  const filtered = drills.filter(d => {
    if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
    const q = query.toLowerCase();
    if (!q) return true;
    return (d.name || "").toLowerCase().includes(q) || (d.desc || "").toLowerCase().includes(q) || (d.subtype || "").toLowerCase().includes(q);
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const saveDrill = (drill) => {
    let next;
    if (drills.find(d => d.id === drill.id)) {
      next = drills.map(d => d.id === drill.id ? drill : d);
    } else {
      next = [...drills, drill];
    }
    onChange(next);
    setEditing(null);
    showToast("Drill saved");
  };

  const deleteDrill = (id) => {
    onChange(drills.filter(d => d.id !== id));
    showToast("Drill removed");
  };

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Drill Library</h1>
          <div style={S.pageSub}>{drills.length} drills · shared across every squad's coaches</div>
        </div>
        <button style={S.btnPrimary} onClick={() => setEditing("new")}><Plus size={16} /> Add drill</button>
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search drills…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div style={S.filterChipRow}>
        <Chip active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>All</Chip>
        {CATEGORIES.map(c => (
          <Chip key={c.key} active={typeFilter === c.key} onClick={() => setTypeFilter(c.key)} color={c.color}>{c.label}</Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Library size={22} />} title="No drills found" body="Add your first drill or adjust your filters." actionLabel="Add drill" onAction={() => setEditing("new")} />
      ) : (
        <div style={S.drillGrid}>
          {filtered.map(d => (
            <div key={d.id} style={S.drillCard}>
              <div style={{ ...S.drillCardBar, background: CATEGORY_MAP[d.type]?.color || "#888" }} />
              <div style={S.drillCardBody}>
                <div style={S.drillCardTop}>
                  <span style={{ ...S.drillTypeTag, color: CATEGORY_MAP[d.type]?.color || "#888" }}>{CATEGORY_MAP[d.type]?.label || d.type}</span>
                  {d.subtype && <span style={S.drillSubTag}>{d.subtype}</span>}
                  {!!d.contact && (
                    <span style={{ ...S.drillContactTag, color: CONTACT_LEVELS[d.contact]?.color, borderColor: CONTACT_LEVELS[d.contact]?.color + "66" }}>
                      <Shield size={9} /> {CONTACT_LEVELS[d.contact]?.short}
                    </span>
                  )}
                </div>
                <div style={S.drillCardName}>{d.name}</div>
                {d.desc && <div style={S.drillCardDesc}>{d.desc}</div>}
                {d.videoUrl && (
                  <a
                    href={d.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.drillVideoLink}
                    onClick={e => e.stopPropagation()}
                  >
                    <PlayCircle size={13} /> Watch reference video
                  </a>
                )}
              </div>
              <div style={S.drillCardActions}>
                <button style={S.iconBtnGhost} onClick={() => setEditing(d)} aria-label="Edit"><Edit3 size={13} /></button>
                <button style={S.iconBtnGhost} onClick={() => deleteDrill(d.id)} aria-label="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <DrillEditModal
          drill={editing === "new" ? null : editing}
          onSave={saveDrill}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Chip({ active, onClick, children, color }) {
  return (
    <button
      style={{
        ...S.chip,
        ...(active ? { background: color ? color + "22" : "var(--surface-2)", borderColor: color || "var(--chalk)", color: color || "var(--chalk)" } : {})
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DrillEditModal({ drill, onSave, onClose }) {
  const [form, setForm] = useState(drill || { id: uid(), type: "SKILL", subtype: "", name: "", desc: "", videoUrl: "", contact: 0 });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const videoMeta = parseVideoMeta(form.videoUrl);
  const videoLooksInvalid = (form.videoUrl || "").trim() && !videoMeta;

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>{drill ? "Edit drill" : "New drill"}</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <label style={S.fieldLabel}>Drill name</label>
        <input style={S.input} value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Goodball sets (opposed)" autoFocus />

        <label style={S.fieldLabel}>Category</label>
        <div style={S.modalChipRow}>
          {CATEGORIES.map(c => (
            <Chip key={c.key} active={form.type === c.key} onClick={() => update("type", c.key)} color={c.color}>{c.label}</Chip>
          ))}
        </div>

        <label style={S.fieldLabel}>Sub-type (optional)</label>
        <input style={S.input} value={form.subtype} onChange={e => update("subtype", e.target.value)} placeholder="e.g. Opposed, Attack, Team" />

        <label style={S.fieldLabel}>Contact level</label>
        <div style={S.modalChipRow}>
          {CONTACT_LEVELS.map(c => (
            <Chip key={c.v} active={form.contact === c.v} onClick={() => update("contact", c.v)} color={c.v === 0 ? undefined : c.color}>{c.label}</Chip>
          ))}
        </div>

        <label style={S.fieldLabel}>Description / coaching points</label>
        <textarea style={S.textarea} rows={3} value={form.desc} onChange={e => update("desc", e.target.value)} placeholder="Setup, key coaching points, variations…" />

        <label style={S.fieldLabel}>Reference video link (optional)</label>
        <div style={S.videoInputRow}>
          <Video size={15} color="var(--text-tertiary)" />
          <input
            style={S.videoInput}
            value={form.videoUrl || ""}
            onChange={e => update("videoUrl", e.target.value)}
            placeholder="youtube.com/watch?v=… , vimeo.com/… , or a club drive link"
          />
        </div>
        {videoLooksInvalid && (
          <div style={S.videoWarning}><AlertCircle size={12} /> Doesn't look like a valid link — it'll still save, just double check it.</div>
        )}
        {videoMeta && (
          <a href={videoMeta.url} target="_blank" rel="noopener noreferrer" style={S.videoPreviewLink} onClick={e => e.stopPropagation()}>
            {videoMeta.thumb ? (
              <img src={videoMeta.thumb} alt="" style={S.videoPreviewThumb} />
            ) : (
              <div style={S.videoPreviewThumbFallback}><PlayCircle size={20} /></div>
            )}
            <span style={S.videoPreviewMeta}>
              <span style={S.videoPreviewProvider}>{videoMeta.provider}</span>
              <span style={S.videoPreviewUrl}>{videoMeta.url}</span>
            </span>
          </a>
        )}

        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} disabled={!form.name.trim()} onClick={() => onSave({ ...form, videoUrl: normalizeVideoUrl(form.videoUrl) })}>Save drill</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   SQUAD VIEW
----------------------------------------------------------------*/

const POSITIONS = ["FB", "WG", "CTR", "FE", "HB", "HK", "PROP", "2RF", "LOCK"];
const AVAILABILITY = [
  { v: "FULL", label: "Full", color: "#3FA34D" },
  { v: "MOD", label: "Modified", color: "#E8A33D" },
  { v: "REHAB", label: "Rehab", color: "#C03B2B" },
  { v: "OFF", label: "Off / unavailable", color: "#7C8A99" },
];

function SquadsView({ teams, activeTeamId, onSwitchTeam, onCreateTeam, onDeleteTeam, onUpdateTeam, onOpenRoster }) {
  const colors = SQUAD_COLORS;
  const [editingTeam, setEditingTeam] = useState(null); // "new" | team object | null
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);

  const openNew = () => { setEditingTeam("new"); setName(""); setColor(colors[0]); };
  const openEdit = (t) => { setEditingTeam(t); setName(t.name); setColor(t.color); };
  const closeModal = () => setEditingTeam(null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingTeam === "new") {
      onCreateTeam(name.trim(), color);
    } else {
      onUpdateTeam(editingTeam.id, { name: name.trim(), color });
    }
    closeModal();
  };

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Squads</h1>
          <div style={S.pageSub}>{teams.length} squad{teams.length === 1 ? "" : "s"} set up</div>
        </div>
        <button style={S.btnPrimary} onClick={openNew}><Plus size={16} /> New squad</button>
      </div>

      <div style={S.squadsGrid}>
        {teams.map(t => {
          const active = t.id === activeTeamId;
          return (
            <div key={t.id} style={{ ...S.squadSwitchCard, borderColor: active ? t.color : "var(--border-1)" }}>
              <div style={S.squadSwitchTopRow}>
                <div style={{ ...S.teamSwatch, background: t.color }} />
                <button style={S.iconBtnGhost} onClick={() => openEdit(t)} aria-label={`Edit ${t.name}`}><Edit3 size={13} /></button>
              </div>
              <div style={S.squadSwitchName}>{t.name}</div>
              {active && <div style={S.squadActiveTag}>Currently selected</div>}
              <div style={S.squadSwitchActions}>
                {!active && (
                  <button style={S.btnGhost} onClick={() => onSwitchTeam(t.id)}>Switch to this squad</button>
                )}
                {active && (
                  <button style={S.btnGhost} onClick={onOpenRoster}><Users size={13} /> View roster</button>
                )}
                <button
                  style={S.iconBtnGhost}
                  onClick={() => { if (confirm(`Remove ${t.name} and all its data?`)) onDeleteTeam(t.id); }}
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingTeam && (
        <div style={S.modalOverlay} onClick={closeModal}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeadRow}>
              <h3 style={S.modalTitle}>{editingTeam === "new" ? "New squad" : "Edit squad"}</h3>
              <button style={S.iconBtnGhost} onClick={closeModal} aria-label="Close"><X size={16} /></button>
            </div>
            <label style={S.fieldLabel}>Squad name</label>
            <input style={S.input} placeholder="e.g. SGB Dragons" value={name} onChange={e => setName(e.target.value)} autoFocus />
            <label style={S.fieldLabel}>Colour</label>
            <div style={S.colorRow}>
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ ...S.colorDot, background: c, outline: color === c ? "2px solid var(--chalk)" : "none" }} aria-label={`Choose colour ${c}`} />
              ))}
            </div>
            <div style={S.modalActions}>
              <button style={S.btnGhost} onClick={closeModal}>Cancel</button>
              <button style={S.btnPrimary} disabled={!name.trim()} onClick={handleSubmit}>
                {editingTeam === "new" ? "Create squad" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const COACH_ROLES = ["Head Coach", "Assistant Coach", "Strength & Conditioning", "Team Manager", "Other"];

function CoachesView({ teams, coaches, onInvite, onUpdate, onRemove, showToast }) {
  const [query, setQuery] = useState("");
  const [editingCoach, setEditingCoach] = useState(null); // "new" | coach object | null

  const save = async (coach) => {
    const isNew = !coaches.find(c => c.id === coach.id);
    try {
      if (isNew) {
        await onInvite(coach);
        showToast(`Invite sent to ${coach.email}`);
      } else {
        await onUpdate(coach);
        showToast("Coach updated");
      }
      setEditingCoach(null);
    } catch (err) {
      showToast(err.message || "Something went wrong saving that coach", "err");
    }
  };

  const remove = async (id) => {
    try {
      await onRemove(id);
      showToast("Coach removed");
    } catch (err) {
      showToast(err.message || "Couldn't remove that coach", "err");
    }
  };

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const filtered = coaches
    .filter(c => (c.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Coaches</h1>
          <div style={S.pageSub}>{coaches.length} coach{coaches.length === 1 ? "" : "es"} · shared across the whole club</div>
        </div>
        <button style={S.btnPrimary} onClick={() => setEditingCoach("new")}><UserPlus size={16} /> Add coach</button>
      </div>

      <div style={S.bulkHint}>
        This sets up who should have access to which squads, ready for whenever this is hosted with real logins. For now, everyone using this app can still see everything — these assignments aren't enforced yet, they're the plan for when they will be.
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search coaches…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCog size={22} />}
          title={query ? "No matches" : "No coaches added yet"}
          body={query ? "Try a different search term." : "Add your coaching staff and set which squads each one should have access to."}
          actionLabel={query ? null : "Add coach"}
          onAction={() => setEditingCoach("new")}
        />
      ) : (
        <div style={S.coachGrid}>
          {filtered.map(c => (
            <div key={c.id} style={S.coachCard}>
              <div style={S.coachCardTop}>
                <div style={S.coachCardName}>{c.name}</div>
                {c.role && <span style={S.coachRoleTag}>{c.role}</span>}
              </div>
              {c.email && (
                <div style={S.coachCardEmail}><Mail size={11} /> {c.email}</div>
              )}
              <div style={S.coachSquadChips}>
                {(c.squadIds || []).length === 0 ? (
                  <span style={S.coachNoSquads}>No squads assigned</span>
                ) : (
                  c.squadIds.map(sid => {
                    const t = teamById[sid];
                    if (!t) return null;
                    return (
                      <span key={sid} style={S.coachSquadChip}>
                        <span style={{ ...S.teamDotSm, background: t.color }} />
                        {t.name}
                      </span>
                    );
                  })
                )}
              </div>
              <div style={S.coachCardActions}>
                <button style={S.iconBtnGhost} onClick={() => setEditingCoach(c)} aria-label="Edit"><Edit3 size={13} /></button>
                <button style={S.iconBtnGhost} onClick={() => { if (confirm(`Remove ${c.name} from the coach directory?`)) remove(c.id); }} aria-label="Remove"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingCoach && (
        <CoachEditModal
          coach={editingCoach === "new" ? null : editingCoach}
          teams={teams}
          onSave={save}
          onClose={() => setEditingCoach(null)}
        />
      )}
    </div>
  );
}

function CoachEditModal({ coach, teams, onSave, onClose }) {
  const [form, setForm] = useState(coach || { id: uid(), name: "", email: "", role: COACH_ROLES[0], squadIds: [] });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSquad = (teamId) => {
    setForm(f => {
      const has = (f.squadIds || []).includes(teamId);
      const next = has ? f.squadIds.filter(id => id !== teamId) : [...(f.squadIds || []), teamId];
      return { ...f, squadIds: next };
    });
  };

  const allSquads = () => setForm(f => ({ ...f, squadIds: teams.map(t => t.id) }));
  const noSquads = () => setForm(f => ({ ...f, squadIds: [] }));

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>{coach ? "Edit coach" : "Add coach"}</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <label style={S.fieldLabel}>Name</label>
        <input style={S.input} value={form.name} onChange={e => update("name", e.target.value)} placeholder="First and last name" autoFocus />

        <label style={S.fieldLabel}>Email (optional)</label>
        <input style={S.input} type="email" value={form.email || ""} onChange={e => update("email", e.target.value)} placeholder="coach@club.com.au" />

        <label style={S.fieldLabel}>Role</label>
        <div style={S.modalChipRow}>
          {COACH_ROLES.map(r => <Chip key={r} active={form.role === r} onClick={() => update("role", r)}>{r}</Chip>)}
        </div>

        <div style={S.coachSquadHeadRow}>
          <label style={S.fieldLabel}>Squad access</label>
          <span style={S.coachSquadHeadActions}>
            <button style={S.linkBtn} onClick={allSquads}>All</button>
            <span style={S.bulkCopyHeadDivider}>·</span>
            <button style={S.linkBtn} onClick={noSquads}>None</button>
          </span>
        </div>
        <div style={S.coachSquadPickList}>
          {teams.map(t => {
            const checked = (form.squadIds || []).includes(t.id);
            return (
              <button key={t.id} style={S.coachSquadPickRow} onClick={() => toggleSquad(t.id)}>
                {checked ? <CheckCircle2 size={16} color="var(--turf)" /> : <div style={S.weekSessionToggleOff} />}
                <span style={{ ...S.teamDotSm, background: t.color }} />
                <span style={S.coachSquadPickName}>{t.name}</span>
              </button>
            );
          })}
          {teams.length === 0 && <div style={S.summaryEmptyNote}>No squads set up yet.</div>}
        </div>

        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} disabled={!form.name.trim()} onClick={() => onSave(form)}>Save coach</button>
        </div>
      </div>
    </div>
  );
}

function SquadView({ squad, onChange, showToast, onBack }) {
  const [editing, setEditing] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = squad.filter(p => (p.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const save = (p) => {
    const next = squad.find(x => x.id === p.id) ? squad.map(x => x.id === p.id ? p : x) : [...squad, p];
    onChange(next);
    setEditing(null);
    showToast("Player saved");
  };
  const remove = (id) => { onChange(squad.filter(p => p.id !== id)); showToast("Player removed"); };

  const setAvailability = (player, value) => {
    if (player.availability === value) return;
    const label = AVAILABILITY.find(a => a.v === value)?.label || value;
    onChange(squad.map(x => x.id === player.id ? { ...x, availability: value } : x));
    showToast(`${player.name} set to ${label}`);
  };

  const bulkAdd = (players) => {
    onChange([...squad, ...players]);
    setBulkImportOpen(false);
    showToast(`${players.length} player${players.length === 1 ? "" : "s"} added`);
  };

  const counts = AVAILABILITY.map(a => ({ ...a, count: squad.filter(p => p.availability === a.v).length }));

  return (
    <div style={S.pageWrap}>
      {onBack && <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Squads</button>}
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Roster</h1>
          <div style={S.pageSub}>{squad.length} players listed</div>
        </div>
        <div style={S.pageHeadActions}>
          <button style={S.btnGhost} onClick={() => setBulkImportOpen(true)}><UserPlus size={15} /> Bulk import</button>
          <button style={S.btnPrimary} onClick={() => setEditing("new")}><Plus size={16} /> Add player</button>
        </div>
      </div>

      <div style={S.homeStatRow}>
        {counts.map(c => (
          <div key={c.v} style={{ ...S.statBox, borderLeft: `3px solid ${c.color}` }}>
            <div style={S.statValue}>{c.count}</div>
            <div style={S.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={S.searchRow}>
        <Search size={15} color="var(--text-secondary)" />
        <input style={S.searchInput} placeholder="Search players…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No players yet"
          body="Paste your full squad list in one go, or add players one at a time."
          actionLabel="Bulk import"
          onAction={() => setBulkImportOpen(true)}
        />
      ) : (
        <div style={S.squadTable}>
          <div style={S.squadHeadRow}>
            <span>Player</span><span>Position</span><span>Availability</span><span></span>
          </div>
          {filtered.map(p => {
            return (
              <div key={p.id} style={S.squadRow}>
                <span style={S.squadName}>{p.name}</span>
                <span style={S.squadPos}>{p.position || "—"}</span>
                <span style={S.availPillRow}>
                  {AVAILABILITY.map(a => {
                    const active = p.availability === a.v;
                    const shortLabel = a.v === "OFF" ? "Off" : a.v === "MOD" ? "Mod" : a.v === "REHAB" ? "Rehab" : "Full";
                    return (
                      <button
                        key={a.v}
                        style={{
                          ...S.availPill,
                          color: active ? "#08130A" : a.color,
                          background: active ? a.color : "transparent",
                          borderColor: a.color,
                        }}
                        onClick={() => setAvailability(p, a.v)}
                        title={a.label}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </span>
                <span style={S.squadRowActions}>
                  <button style={S.iconBtnGhost} onClick={() => setEditing(p)} aria-label="Edit"><Edit3 size={13} /></button>
                  <button style={S.iconBtnGhost} onClick={() => remove(p.id)} aria-label="Remove"><Trash2 size={13} /></button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <PlayerEditModal player={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} />
      )}
      {bulkImportOpen && (
        <BulkImportModal existingNames={squad.map(p => p.name)} onImport={bulkAdd} onClose={() => setBulkImportOpen(false)} />
      )}
    </div>
  );
}

const PLAY_CREATOR_CSS_B64 = "LnBsYXktY3JlYXRvci1yb290IHsKICBmb250LWZhbWlseTonU2Vnb2UgVUknLC1hcHBsZS1zeXN0ZW0sQmxpbmtNYWNTeXN0ZW1Gb250LHN5c3RlbS11aSxzYW5zLXNlcmlmOwogIGhlaWdodDoxMDAlOwogIGRpc3BsYXk6ZmxleDsKICBmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgYm9yZGVyLXJhZGl1czoxMnB4OwogIG92ZXJmbG93OmhpZGRlbjsKICBwb3NpdGlvbjpyZWxhdGl2ZTsKICBiYWNrZ3JvdW5kOiMxMDE3MWI7CiAgY29sb3I6I2VlZjJmMTsKfQoKLnBsYXktY3JlYXRvci1yb290ICosIC5wbGF5LWNyZWF0b3Itcm9vdCAqOjpiZWZvcmUsIC5wbGF5LWNyZWF0b3Itcm9vdCAqOjphZnRlcntib3gtc2l6aW5nOmJvcmRlci1ib3g7bWFyZ2luOjA7cGFkZGluZzowfQoucGxheS1jcmVhdG9yLXJvb3R7CiAgLS1wYy1ncmVlbi0xOiMzYTk0NDg7CiAgLS1wYy1ncmVlbi0yOiMyZTdjMzg7CiAgLS1wYy1ncmVlbi1nb2FsLTE6IzI4NjYzYTsKICAtLXBjLWdyZWVuLWdvYWwtMjojMjI2MDMwOwogIC0tcGMtYmc6IzEwMTcxYjsKICAtLXBjLXBhbmVsOiMxODIyMjY5MDsKICAtLXBjLXBhbmVsLXNvbGlkOiMxYjI1Mjk7CiAgLS1wYy1wYW5lbC1ib3JkZXI6IzJhMzYzYjsKICAtLXBjLWluazojZWVmMmYxOwogIC0tcGMtaW5rLWRpbTojOWZiMGFkOwogIC0tcGMtYWNjZW50OiNlOGI4NGI7CiAgLS1wYy1hY2NlbnQtMjojNWNjOGU4OwogIC0tcGMtZGFuZ2VyOiNlODY0NWM7CiAgLS1wYy1saW5lLXdoaXRlOiNmZmZmZmY7CiAgLS1wYy1yLXNtOjZweDsKICAtLXBjLXItbWQ6MTBweDsKICAtLXBjLXItbGc6MTRweDsKICAtLXBjLWRpc2Mtc2l6ZTo0MHB4Owp9Ci8qIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCBUT1AgQkFSIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwoKLnBsYXktY3JlYXRvci1yb290IC50b3BiYXJ7CiAgZGlzcGxheTpmbGV4OwogIGFsaWduLWl0ZW1zOmNlbnRlcjsKICBnYXA6MTBweDsKICBwYWRkaW5nOjEwcHggMTZweDsKICBiYWNrZ3JvdW5kOnZhcigtLXBjLXBhbmVsLXNvbGlkKTsKICBib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1wYy1wYW5lbC1ib3JkZXIpOwogIGZsZXgtc2hyaW5rOjA7CiAgei1pbmRleDo1MDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnRvcGJhciAubG9nb3sKICBmb250LXdlaWdodDo4MDA7CiAgZm9udC1zaXplOjE0cHg7CiAgbGV0dGVyLXNwYWNpbmc6MC4wNGVtOwogIHRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTsKICBjb2xvcjp2YXIoLS1wYy1pbmspOwogIGRpc3BsYXk6ZmxleDsKICBhbGlnbi1pdGVtczpjZW50ZXI7CiAgZ2FwOjhweDsKICB3aGl0ZS1zcGFjZTpub3dyYXA7Cn0KLnBsYXktY3JlYXRvci1yb290IC5sb2dvIC5kb3R7d2lkdGg6OHB4O2hlaWdodDo4cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDp2YXIoLS1wYy1hY2NlbnQpO30KCi5wbGF5LWNyZWF0b3Itcm9vdCAucGxheS1uYW1lLWlucHV0ewogIGJhY2tncm91bmQ6dHJhbnNwYXJlbnQ7CiAgYm9yZGVyOjFweCBzb2xpZCB0cmFuc3BhcmVudDsKICBjb2xvcjp2YXIoLS1wYy1pbmspOwogIGZvbnQtc2l6ZToxNHB4OwogIGZvbnQtd2VpZ2h0OjYwMDsKICBwYWRkaW5nOjZweCA5cHg7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLXNtKTsKICBtaW4td2lkdGg6MTQwcHg7CiAgb3V0bGluZTpub25lOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAucGxheS1uYW1lLWlucHV0OmhvdmVye2JvcmRlci1jb2xvcjp2YXIoLS1wYy1wYW5lbC1ib3JkZXIpO30KLnBsYXktY3JlYXRvci1yb290IC5wbGF5LW5hbWUtaW5wdXQ6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLXBjLWFjY2VudCk7YmFja2dyb3VuZDojMDAwMDAwMmE7fQoKLnBsYXktY3JlYXRvci1yb290IC50b3BiYXItc3BhY2Vye2ZsZXg6MTt9CgoucGxheS1jcmVhdG9yLXJvb3QgLnRidG57CiAgZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4OwogIGZvbnQtc2l6ZToxMi41cHg7Zm9udC13ZWlnaHQ6NjAwOwogIHBhZGRpbmc6N3B4IDEycHg7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLXNtKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLXBjLXBhbmVsLWJvcmRlcik7CiAgYmFja2dyb3VuZDojZmZmZmZmMDg7CiAgY29sb3I6dmFyKC0tcGMtaW5rKTsKICBjdXJzb3I6cG9pbnRlcjsKICBmb250LWZhbWlseTppbmhlcml0OwogIHRyYW5zaXRpb246YmFja2dyb3VuZCAuMTJzLGJvcmRlci1jb2xvciAuMTJzOwogIHdoaXRlLXNwYWNlOm5vd3JhcDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnRidG46aG92ZXJ7YmFja2dyb3VuZDojZmZmZmZmMTQ7fQoucGxheS1jcmVhdG9yLXJvb3QgLnRidG4ucHJpbWFyeXtiYWNrZ3JvdW5kOnZhcigtLXBjLWFjY2VudCk7Y29sb3I6IzFhMTMwMDtib3JkZXItY29sb3I6dmFyKC0tcGMtYWNjZW50KTt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudGJ0bi5wcmltYXJ5OmhvdmVye2JhY2tncm91bmQ6I2YwYzc2ODt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudGJ0bi5kYW5nZXJ7Y29sb3I6dmFyKC0tcGMtZGFuZ2VyKTtib3JkZXItY29sb3I6I2U4NjQ1YzQwO30KLnBsYXktY3JlYXRvci1yb290IC50YnRuLmRhbmdlcjpob3ZlcntiYWNrZ3JvdW5kOiNlODY0NWMxYTt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudGJ0biBzdmd7ZmxleC1zaHJpbms6MDt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudGJ0bjpkaXNhYmxlZHtvcGFjaXR5OjAuMzU7Y3Vyc29yOmRlZmF1bHQ7cG9pbnRlci1ldmVudHM6bm9uZTt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAjc2F2ZS1idG46ZGlzYWJsZWR7b3BhY2l0eToxO2JhY2tncm91bmQ6IzNmYWU2YTMwO2JvcmRlci1jb2xvcjojM2ZhZTZhO2NvbG9yOiM2YmUzOWE7fQoKLyog4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAIE1BSU4gTEFZT1VUIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwoKLnBsYXktY3JlYXRvci1yb290IC5tYWluewogIGZsZXg6MTsKICBkaXNwbGF5OmZsZXg7CiAgbWluLWhlaWdodDowOwp9CgovKiDilIDilIDilIDilIDilIDilIDilIDilIDilIAgTEVGVDogRElTQyBUUkFZIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwoKLnBsYXktY3JlYXRvci1yb290IC50cmF5ewogIHdpZHRoOjEwOHB4OwogIGZsZXgtc2hyaW5rOjA7CiAgYmFja2dyb3VuZDp2YXIoLS1wYy1wYW5lbC1zb2xpZCk7CiAgYm9yZGVyLXJpZ2h0OjFweCBzb2xpZCB2YXIoLS1wYy1wYW5lbC1ib3JkZXIpOwogIHBhZGRpbmc6MTJweCAxMHB4OwogIGRpc3BsYXk6ZmxleDsKICBmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgZ2FwOjhweDsKICBvdmVyZmxvdy15OmF1dG87Cn0KLnBsYXktY3JlYXRvci1yb290IC50cmF5IGg1ewogIGZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjcwMDtjb2xvcjp2YXIoLS1wYy1pbmstZGltKTsKICB0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7bGV0dGVyLXNwYWNpbmc6MC4wOGVtOwogIG1hcmdpbi1ib3R0b206MnB4Owp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudHJheS1kaXNjc3sKICBkaXNwbGF5OmdyaWQ7CiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7CiAgZ2FwOjdweDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnRyYXktZGlzY3sKICB3aWR0aDoxMDAlOwogIGFzcGVjdC1yYXRpbzoxOwogIGJvcmRlci1yYWRpdXM6NTAlOwogIGJhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSBhdCAzMiUgMjglLCAjZmZmLCAjZjFlZGUwIDU1JSwgI2Q4Y2ZhOCAxMDAlKTsKICBib3JkZXI6MnB4IHNvbGlkICNmZmZmZmY7CiAgYm94LXNoYWRvdzowIDJweCA0cHggcmdiYSgwLDAsMCwwLjM1KTsKICBkaXNwbGF5OmZsZXg7CiAgYWxpZ24taXRlbXM6Y2VudGVyOwogIGp1c3RpZnktY29udGVudDpjZW50ZXI7CiAgZm9udC13ZWlnaHQ6ODAwOwogIGZvbnQtc2l6ZToxNHB4OwogIGNvbG9yOiMxYTFhMWE7CiAgY3Vyc29yOmdyYWI7CiAgdXNlci1zZWxlY3Q6bm9uZTsKICB0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMXMsIG9wYWNpdHkgLjE1czsKICBwb3NpdGlvbjpyZWxhdGl2ZTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnRyYXktZGlzYzpob3Zlcnt0cmFuc2Zvcm06c2NhbGUoMS4wNyk7fQoucGxheS1jcmVhdG9yLXJvb3QgLnRyYXktZGlzYzphY3RpdmV7Y3Vyc29yOmdyYWJiaW5nO30KLnBsYXktY3JlYXRvci1yb290IC50cmF5LWRpc2MucGxhY2Vke29wYWNpdHk6MC4yNTtjdXJzb3I6ZGVmYXVsdDtwb2ludGVyLWV2ZW50czpub25lO30KLnBsYXktY3JlYXRvci1yb290IC50cmF5LWRpc2MteHsKICBncmlkLWNvbHVtbjoxIC8gLTE7CiAgd2lkdGg6MTAwJTsKICBhc3BlY3QtcmF0aW86Mi40OwogIGJvcmRlci1yYWRpdXM6dmFyKC0tcGMtci1tZCk7CiAgYmFja2dyb3VuZDojMmExNDE0OwogIGJvcmRlcjoycHggZGFzaGVkICNlODY0NWM7CiAgY29sb3I6I2U4NjQ1YzsKICBmb250LXNpemU6MThweDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnRyYXktZGlzYy14OmhvdmVye3RyYW5zZm9ybTpzY2FsZSgxLjA0KTt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAudHJheS1oaW50ewogIGZvbnQtc2l6ZToxMHB4O2NvbG9yOnZhcigtLXBjLWluay1kaW0pO2xpbmUtaGVpZ2h0OjEuNTsKICBwYWRkaW5nLXRvcDo2cHg7Ym9yZGVyLXRvcDoxcHggc29saWQgdmFyKC0tcGMtcGFuZWwtYm9yZGVyKTttYXJnaW4tdG9wOjRweDsKfQoKLyog4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAIENFTlRFUjogRklFTEQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovCgoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWFyZWF7CiAgZmxleDoxOwogIHBvc2l0aW9uOnJlbGF0aXZlOwogIGJhY2tncm91bmQ6IzBhMTIxMDsKICBvdmVyZmxvdzphdXRvOwogIGRpc3BsYXk6ZmxleDsKICBhbGlnbi1pdGVtczpmbGV4LXN0YXJ0OwogIGp1c3RpZnktY29udGVudDpjZW50ZXI7CiAgcGFkZGluZzoxOHB4Owp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtd3JhcHsKICBwb3NpdGlvbjpyZWxhdGl2ZTsKICB3aWR0aDoxMDAlOwogIG1heC13aWR0aDo2ODBweDsKICBmbGV4LXNocmluazowOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtd3JhcCBzdmcuZmllbGQtYmd7CiAgZGlzcGxheTpibG9jazsKICB3aWR0aDoxMDAlOwogIGhlaWdodDphdXRvOwogIGJvcmRlci1yYWRpdXM6dmFyKC0tcGMtci1tZCk7CiAgYm94LXNoYWRvdzowIDhweCA0MHB4IHJnYmEoMCwwLDAsMC41KTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLXN1cmZhY2V7CiAgcG9zaXRpb246YWJzb2x1dGU7CiAgaW5zZXQ6MDsKICBib3JkZXItcmFkaXVzOnZhcigtLXBjLXItbWQpOwp9CgovKiBhcnJvdyBkcmF3aW5nIGxheWVyICovCgoucGxheS1jcmVhdG9yLXJvb3QgLmFycm93LXN2Z3sKICBwb3NpdGlvbjphYnNvbHV0ZTsKICBpbnNldDowOwogIHdpZHRoOjEwMCU7CiAgaGVpZ2h0OjEwMCU7CiAgcG9pbnRlci1ldmVudHM6bm9uZTsKICBvdmVyZmxvdzp2aXNpYmxlOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuYXJyb3ctcGF0aHsKICBmaWxsOm5vbmU7CiAgc3Ryb2tlOnZhcigtLXBjLWxpbmUtd2hpdGUpOwogIHN0cm9rZS13aWR0aDozOwogIHBvaW50ZXItZXZlbnRzOnN0cm9rZTsKICBjdXJzb3I6cG9pbnRlcjsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmFycm93LXBhdGguY3VydmVke3N0cm9rZTp2YXIoLS1wYy1hY2NlbnQtMik7fQoucGxheS1jcmVhdG9yLXJvb3QgLmFycm93LXBhdGg6aG92ZXJ7c3Ryb2tlOnZhcigtLXBjLWRhbmdlcikgIWltcG9ydGFudDt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuYXJyb3ctaGFuZGxlewogIGZpbGw6dmFyKC0tcGMtYWNjZW50KTsKICBzdHJva2U6IzFhMTMwMDsKICBzdHJva2Utd2lkdGg6MS41OwogIGN1cnNvcjpncmFiOwogIHBvaW50ZXItZXZlbnRzOmFsbDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmFycm93LWhhbmRsZTphY3RpdmV7Y3Vyc29yOmdyYWJiaW5nO30KLnBsYXktY3JlYXRvci1yb290IC5hcnJvdy1oYW5kbGUuZW5kcG9pbnR7CiAgZmlsbDp2YXIoLS1wYy1kYW5nZXIpOwogIHN0cm9rZTojMmEwYTA4Owp9CgovKiBkaXNjcyBwbGFjZWQgb24gZmllbGQgKi8KCi5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtZGlzY3sKICBwb3NpdGlvbjphYnNvbHV0ZTsKICB3aWR0aDp2YXIoLS1wYy1kaXNjLXNpemUsIDQwcHgpOwogIGhlaWdodDp2YXIoLS1wYy1kaXNjLXNpemUsIDQwcHgpOwogIGJvcmRlci1yYWRpdXM6NTAlOwogIGJhY2tncm91bmQ6cmFkaWFsLWdyYWRpZW50KGNpcmNsZSBhdCAzMiUgMjglLCAjZmZmLCAjZjFlZGUwIDU1JSwgI2Q4Y2ZhOCAxMDAlKTsKICBib3JkZXI6Mi41cHggc29saWQgI2ZmZmZmZjsKICBib3gtc2hhZG93OjAgM3B4IDZweCByZ2JhKDAsMCwwLDAuNCk7CiAgZGlzcGxheTpmbGV4OwogIGFsaWduLWl0ZW1zOmNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOwogIGZvbnQtd2VpZ2h0OjgwMDsKICBmb250LXNpemU6dmFyKC0tcGMtZGlzYy1mb250LCAxNXB4KTsKICBjb2xvcjojMWExYTFhOwogIGN1cnNvcjpncmFiOwogIHVzZXItc2VsZWN0Om5vbmU7CiAgdHJhbnNmb3JtOnRyYW5zbGF0ZSgtNTAlLC01MCUpOwogIHotaW5kZXg6MTA7CiAgdHJhbnNpdGlvbjpib3gtc2hhZG93IC4xMnMsIHdpZHRoIC4xNXMsIGhlaWdodCAuMTVzLCBmb250LXNpemUgLjE1czsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWRpc2M6YWN0aXZle2N1cnNvcjpncmFiYmluZzt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtZGlzYy5zZWxlY3RlZHsKICBib3gtc2hhZG93OjAgMCAwIDNweCB2YXIoLS1wYy1hY2NlbnQpLCAwIDNweCA2cHggcmdiYSgwLDAsMCwwLjQpOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtZGlzYy14ewogIGJhY2tncm91bmQ6IzJhMTQxNDsKICBib3JkZXI6M3B4IHNvbGlkICNlODY0NWM7CiAgY29sb3I6I2U4NjQ1YzsKICBmb250LXNpemU6Y2FsYyh2YXIoLS1wYy1kaXNjLWZvbnQsIDE1cHgpICogMS4xKTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWRpc2MteC5zZWxlY3RlZHsKICBib3gtc2hhZG93OjAgMCAwIDNweCB2YXIoLS1wYy1hY2NlbnQpLCAwIDNweCA2cHggcmdiYSgwLDAsMCwwLjQpOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAuZmllbGQtZGlzYyAucmVtb3ZlLWRpc2N7CiAgcG9zaXRpb246YWJzb2x1dGU7CiAgdG9wOi02cHg7cmlnaHQ6LTZweDsKICB3aWR0aDoxNnB4O2hlaWdodDoxNnB4OwogIGJvcmRlci1yYWRpdXM6NTAlOwogIGJhY2tncm91bmQ6dmFyKC0tcGMtZGFuZ2VyKTsKICBjb2xvcjojZmZmOwogIGZvbnQtc2l6ZToxMHB4OwogIGRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjsKICBjdXJzb3I6cG9pbnRlcjsKICBvcGFjaXR5OjA7CiAgdHJhbnNpdGlvbjpvcGFjaXR5IC4xMnM7CiAgYm9yZGVyOjEuNXB4IHNvbGlkIHZhcigtLXBjLWJnKTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWRpc2M6aG92ZXIgLnJlbW92ZS1kaXNje29wYWNpdHk6MTt9CgoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWRyb3Atem9uZXsKICBwb3NpdGlvbjphYnNvbHV0ZTsKICBpbnNldDowOwogIHotaW5kZXg6NTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmZpZWxkLWRyb3Atem9uZS5kcmFnLWFjdGl2ZXsKICBiYWNrZ3JvdW5kOnJnYmEoMjMyLDE4NCw3NSwwLjA2KTsKfQoKLnBsYXktY3JlYXRvci1yb290IC5kcmF3LWhpbnQtYmFubmVyewogIHBvc2l0aW9uOmFic29sdXRlOwogIHRvcDoxMHB4O2xlZnQ6NTAlOwogIHRyYW5zZm9ybTp0cmFuc2xhdGVYKC01MCUpOwogIGJhY2tncm91bmQ6cmdiYSgyMCwzMCwyNSwwLjkyKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLXBjLWFjY2VudCk7CiAgY29sb3I6dmFyKC0tcGMtYWNjZW50KTsKICBmb250LXNpemU6MTJweDsKICBmb250LXdlaWdodDo2MDA7CiAgcGFkZGluZzo2cHggMTRweDsKICBib3JkZXItcmFkaXVzOjIwcHg7CiAgei1pbmRleDozMDsKICBwb2ludGVyLWV2ZW50czpub25lOwogIHdoaXRlLXNwYWNlOm5vd3JhcDsKfQoKLyog4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAIFJJR0hUOiBQTEFZUyBQQU5FTCDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KCi5wbGF5LWNyZWF0b3Itcm9vdCAucGxheXMtcGFuZWx7CiAgd2lkdGg6MjAwcHg7CiAgZmxleC1zaHJpbms6MDsKICBiYWNrZ3JvdW5kOnZhcigtLXBjLXBhbmVsLXNvbGlkKTsKICBib3JkZXItbGVmdDoxcHggc29saWQgdmFyKC0tcGMtcGFuZWwtYm9yZGVyKTsKICBwYWRkaW5nOjEycHg7CiAgZGlzcGxheTpmbGV4OwogIGZsZXgtZGlyZWN0aW9uOmNvbHVtbjsKICBnYXA6MTBweDsKICBvdmVyZmxvdy15OmF1dG87Cn0KLnBsYXktY3JlYXRvci1yb290IC5wbGF5cy1wYW5lbCBoNXsKICBmb250LXNpemU6MTBweDtmb250LXdlaWdodDo3MDA7Y29sb3I6dmFyKC0tcGMtaW5rLWRpbSk7CiAgdGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2xldHRlci1zcGFjaW5nOjAuMDhlbTsKfQoucGxheS1jcmVhdG9yLXJvb3QgLnBsYXlzLWxpc3R7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6OHB4O30KLnBsYXktY3JlYXRvci1yb290IC5wbGF5LWNhcmR7CiAgYm9yZGVyOjEuNXB4IHNvbGlkIHZhcigtLXBjLXBhbmVsLWJvcmRlcik7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLW1kKTsKICBvdmVyZmxvdzpoaWRkZW47CiAgY3Vyc29yOnBvaW50ZXI7CiAgYmFja2dyb3VuZDojZmZmZmZmMDU7CiAgdHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjEycywgYmFja2dyb3VuZCAuMTJzOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAucGxheS1jYXJkOmhvdmVye2JvcmRlci1jb2xvcjojZmZmZmZmMzA7fQoucGxheS1jcmVhdG9yLXJvb3QgLnBsYXktY2FyZC5hY3RpdmV7Ym9yZGVyLWNvbG9yOnZhcigtLXBjLWFjY2VudCk7YmFja2dyb3VuZDojZThiODRiMTA7fQoucGxheS1jcmVhdG9yLXJvb3QgLnBsYXktY2FyZCAudGh1bWJ7CiAgd2lkdGg6MTAwJTsKICBoZWlnaHQ6OTBweDsKICBiYWNrZ3JvdW5kOiMxYTJhMWY7CiAgZGlzcGxheTpibG9jazsKICBvYmplY3QtZml0OmNvdmVyOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAucGxheS1jYXJkIC5tZXRhewogIHBhZGRpbmc6NnB4IDhweDsKICBkaXNwbGF5OmZsZXg7CiAgYWxpZ24taXRlbXM6Y2VudGVyOwogIGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOwogIGdhcDo0cHg7Cn0KLnBsYXktY3JlYXRvci1yb290IC5wbGF5LWNhcmQgLm1ldGEgLm5hbWV7CiAgZm9udC1zaXplOjExLjVweDtmb250LXdlaWdodDo2MDA7CiAgb3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7d2hpdGUtc3BhY2U6bm93cmFwOwp9Ci5wbGF5LWNyZWF0b3Itcm9vdCAucGxheS1jYXJkIC5tZXRhIC5kZWx7CiAgZm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tcGMtaW5rLWRpbSk7CiAgY3Vyc29yOnBvaW50ZXI7ZmxleC1zaHJpbms6MDsKICBwYWRkaW5nOjJweCA0cHg7Ym9yZGVyLXJhZGl1czo0cHg7Cn0KLnBsYXktY3JlYXRvci1yb290IC5wbGF5LWNhcmQgLm1ldGEgLmRlbDpob3Zlcntjb2xvcjp2YXIoLS1wYy1kYW5nZXIpO2JhY2tncm91bmQ6I2U4NjQ1YzFhO30KCi5wbGF5LWNyZWF0b3Itcm9vdCAuZW1wdHktcGxheXN7CiAgZm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tcGMtaW5rLWRpbSk7CiAgdGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4IDZweDsKICBib3JkZXI6MS41cHggZGFzaGVkIHZhcigtLXBjLXBhbmVsLWJvcmRlcik7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLW1kKTsKICBsaW5lLWhlaWdodDoxLjU7Cn0KCi8qIGFycm93IHN0eWxlIHRvZ2dsZSAqLwoKLnBsYXktY3JlYXRvci1yb290IC5hcnJvdy1zdHlsZS10b2dnbGV7CiAgZGlzcGxheTpmbGV4OwogIGdhcDo2cHg7CiAgYmFja2dyb3VuZDojZmZmZmZmMDg7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLXNtKTsKICBwYWRkaW5nOjNweDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLmFycm93LXN0eWxlLXRvZ2dsZSBidXR0b257CiAgZmxleDoxOwogIGZvbnQtc2l6ZToxMXB4O2ZvbnQtd2VpZ2h0OjYwMDsKICBwYWRkaW5nOjZweCA0cHg7CiAgYm9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czo1cHg7CiAgYmFja2dyb3VuZDp0cmFuc3BhcmVudDtjb2xvcjp2YXIoLS1wYy1pbmstZGltKTsKICBjdXJzb3I6cG9pbnRlcjtmb250LWZhbWlseTppbmhlcml0OwogIHRyYW5zaXRpb246YmFja2dyb3VuZCAuMTJzLGNvbG9yIC4xMnM7Cn0KLnBsYXktY3JlYXRvci1yb290IC5hcnJvdy1zdHlsZS10b2dnbGUgYnV0dG9uLmFjdGl2ZXsKICBiYWNrZ3JvdW5kOnZhcigtLXBjLWFjY2VudCk7Y29sb3I6IzFhMTMwMDsKfQoKLyogbW9kYWwgZm9yIGV4cG9ydC9zYXZlIG5hbWUgKi8KCi5wbGF5LWNyZWF0b3Itcm9vdCAubW9kYWwtb3ZlcmxheXsKICBwb3NpdGlvbjphYnNvbHV0ZTtpbnNldDowOwogIGJhY2tncm91bmQ6cmdiYSgwLDAsMCwwLjU1KTsKICBkaXNwbGF5Om5vbmU7CiAgYWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7CiAgei1pbmRleDoyMDA7Cn0KLnBsYXktY3JlYXRvci1yb290IC5tb2RhbC1vdmVybGF5LnNob3d7ZGlzcGxheTpmbGV4O30KLnBsYXktY3JlYXRvci1yb290IC5tb2RhbHsKICBiYWNrZ3JvdW5kOnZhcigtLXBjLXBhbmVsLXNvbGlkKTsKICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLXBjLXBhbmVsLWJvcmRlcik7CiAgYm9yZGVyLXJhZGl1czp2YXIoLS1wYy1yLWxnKTsKICBwYWRkaW5nOjIwcHg7CiAgd2lkdGg6MzAwcHg7CiAgZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtnYXA6MTJweDsKfQoucGxheS1jcmVhdG9yLXJvb3QgLm1vZGFsIGgze2ZvbnQtc2l6ZToxNHB4O2ZvbnQtd2VpZ2h0OjcwMDt9Ci5wbGF5LWNyZWF0b3Itcm9vdCAubW9kYWwtcm93e2Rpc3BsYXk6ZmxleDtnYXA6OHB4O30KLnBsYXktY3JlYXRvci1yb290IC5tb2RhbCBidXR0b257CiAgZmxleDoxO3BhZGRpbmc6OHB4O2JvcmRlci1yYWRpdXM6dmFyKC0tcGMtci1zbSk7CiAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1wYy1wYW5lbC1ib3JkZXIpOwogIGJhY2tncm91bmQ6I2ZmZmZmZjEwO2NvbG9yOnZhcigtLXBjLWluayk7CiAgZm9udC1mYW1pbHk6aW5oZXJpdDtmb250LXNpemU6MTIuNXB4O2ZvbnQtd2VpZ2h0OjYwMDtjdXJzb3I6cG9pbnRlcjsKfQoucGxheS1jcmVhdG9yLXJvb3QgLm1vZGFsIGJ1dHRvbi5wcmltYXJ5e2JhY2tncm91bmQ6dmFyKC0tcGMtYWNjZW50KTtjb2xvcjojMWExMzAwO2JvcmRlci1jb2xvcjp2YXIoLS1wYy1hY2NlbnQpO30KCi5wbGF5LWNyZWF0b3Itcm9vdCA6Oi13ZWJraXQtc2Nyb2xsYmFye3dpZHRoOjZweDtoZWlnaHQ6NnB4O30KLnBsYXktY3JlYXRvci1yb290IDo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWJ7YmFja2dyb3VuZDojZmZmZmZmMjA7Ym9yZGVyLXJhZGl1czozcHg7fQoKQG1lZGlhKG1heC13aWR0aDo5MDBweCl7CiAgLnBsYXktY3JlYXRvci1yb290IC50cmF5e3dpZHRoOjg0cHg7fQogIC5wbGF5LWNyZWF0b3Itcm9vdCAucGxheXMtcGFuZWx7d2lkdGg6MTUwcHg7fQp9Cg==";
const PLAY_CREATOR_HTML_B64 = "PGRpdiBjbGFzcz0icGxheS1jcmVhdG9yLXJvb3QiPgo8IS0tIFRPUCBCQVIgLS0+CjxkaXYgY2xhc3M9InRvcGJhciI+CiAgPGRpdiBjbGFzcz0ibG9nbyI+PHNwYW4gY2xhc3M9ImRvdCI+PC9zcGFuPlBsYXkgQ3JlYXRvcjwvZGl2PgogIDxpbnB1dCBjbGFzcz0icGxheS1uYW1lLWlucHV0IiBpZD0icGxheS1uYW1lIiBwbGFjZWhvbGRlcj0iVW50aXRsZWQgcGxheSIgdmFsdWU9IlVudGl0bGVkIHBsYXkiLz4KICA8ZGl2IGNsYXNzPSJ0b3BiYXItc3BhY2VyIj48L2Rpdj4KCiAgPGRpdiBjbGFzcz0iYXJyb3ctc3R5bGUtdG9nZ2xlIiBpZD0iZGlzYy1zaXplLXRvZ2dsZSIgdGl0bGU9IlBsYXllciBkaXNjIHNpemUiPgogICAgPGJ1dHRvbiBkYXRhLXNpemU9InNtYWxsIiB0aXRsZT0iU21hbGwgZGlzY3MiPlM8L2J1dHRvbj4KICAgIDxidXR0b24gY2xhc3M9ImFjdGl2ZSIgZGF0YS1zaXplPSJtZWRpdW0iIHRpdGxlPSJNZWRpdW0gZGlzY3MiPk08L2J1dHRvbj4KICAgIDxidXR0b24gZGF0YS1zaXplPSJsYXJnZSIgdGl0bGU9IkxhcmdlIGRpc2NzIj5MPC9idXR0b24+CiAgPC9kaXY+CgogIDxkaXYgY2xhc3M9ImFycm93LXN0eWxlLXRvZ2dsZSIgaWQ9ImFycm93LXN0eWxlLXRvZ2dsZSI+CiAgICA8YnV0dG9uIGNsYXNzPSJhY3RpdmUiIGRhdGEtc3R5bGU9InN0cmFpZ2h0Ij5TdHJhaWdodDwvYnV0dG9uPgogICAgPGJ1dHRvbiBkYXRhLXN0eWxlPSJjdXJ2ZWQiPkN1cnZlZDwvYnV0dG9uPgogIDwvZGl2PgoKICA8YnV0dG9uIGNsYXNzPSJ0YnRuIiBpZD0idW5kby1hcnJvdy1idG4iIHRpdGxlPSJSZW1vdmUgbGFzdCBhcnJvdyI+CiAgICA8c3ZnIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgN3Y2aDYiLz48cGF0aCBkPSJNMjEgMTdhOSA5IDAgMCAwLTE1LTYuN0wzIDEzIi8+PC9zdmc+CiAgICBVbmRvIGFycm93CiAgPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0idGJ0biBkYW5nZXIiIGlkPSJjbGVhci1idG4iPgogICAgPHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwb2x5bGluZSBwb2ludHM9IjEgNCAxIDEwIDcgMTAiLz48cGF0aCBkPSJNMy41MSAxNWE5IDkgMCAxIDAgLjQ5LTMuOSIvPjwvc3ZnPgogICAgQ2xlYXIgZmllbGQKICA8L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJ0YnRuIiBpZD0ic2F2ZS1idG4iPgogICAgPHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMi4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDExbDUgNXYxMWEyIDIgMCAwIDEtMiAyeiIvPjxwb2x5bGluZSBwb2ludHM9IjE3IDIxIDE3IDEzIDcgMTMgNyAyMSIvPjxwb2x5bGluZSBwb2ludHM9IjcgMyA3IDggMTUgOCIvPjwvc3ZnPgogICAgU2F2ZSBwbGF5CiAgPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0idGJ0biBwcmltYXJ5IiBpZD0iZXhwb3J0LWJ0biI+CiAgICA8c3ZnIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDE1djRhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJ2LTQiLz48cG9seWxpbmUgcG9pbnRzPSI3IDEwIDEyIDE1IDE3IDEwIi8+PGxpbmUgeDE9IjEyIiB5MT0iMTUiIHgyPSIxMiIgeTI9IjMiLz48L3N2Zz4KICAgIEV4cG9ydAogIDwvYnV0dG9uPgo8L2Rpdj4KCjwhLS0gTUFJTiAtLT4KPGRpdiBjbGFzcz0ibWFpbiI+CgogIDwhLS0gVFJBWSAtLT4KICA8ZGl2IGNsYXNzPSJ0cmF5Ij4KICAgIDxoNT5QbGF5ZXJzPC9oNT4KICAgIDxkaXYgY2xhc3M9InRyYXktZGlzY3MiIGlkPSJ0cmF5LWRpc2NzIj48L2Rpdj4KICAgIDxkaXYgY2xhc3M9InRyYXktaGludCI+RHJhZyBhIGRpc2Mgb250byB0aGUgZmllbGQuIENsaWNrIGEgcGxhY2VkIGRpc2MsIHRoZW4gY2xpY2sgZW1wdHkgZmllbGQgdG8gZHJhdyBhIHBhdGguPC9kaXY+CiAgPC9kaXY+CgogIDwhLS0gRklFTEQgLS0+CiAgPGRpdiBjbGFzcz0iZmllbGQtYXJlYSI+CiAgICA8ZGl2IGNsYXNzPSJmaWVsZC13cmFwIiBpZD0iZmllbGQtd3JhcCI+CiAgICAgIDxzdmcgY2xhc3M9ImZpZWxkLWJnIiB2aWV3Qm94PSIwIDAgNTYwIDU2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgICAgICA8ZGVmcz4KICAgICAgICAgIDxwYXR0ZXJuIGlkPSJzMSIgeD0iMCIgeT0iMCIgd2lkdGg9IjU2MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgICAgICAgIDxyZWN0IHdpZHRoPSI1NjAiIGhlaWdodD0iNDAiIGZpbGw9IiMzYTk0NDgiLz4KICAgICAgICAgICAgPHJlY3QgeT0iNDAiIHdpZHRoPSI1NjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZTdjMzgiLz4KICAgICAgICAgIDwvcGF0dGVybj4KICAgICAgICAgIDxwYXR0ZXJuIGlkPSJzMiIgeD0iMCIgeT0iMCIgd2lkdGg9IjU2MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgICAgICAgIDxyZWN0IHdpZHRoPSI1NjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyODY2M2EiLz4KICAgICAgICAgICAgPHJlY3QgeT0iNDAiIHdpZHRoPSI1NjAiIGhlaWdodD0iNDAiIGZpbGw9IiMyMjYwMzAiLz4KICAgICAgICAgIDwvcGF0dGVybj4KICAgICAgICAgIDxyYWRpYWxHcmFkaWVudCBpZD0idmlnIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI3MCUiPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjU1JSIgc3RvcC1jb2xvcj0iYmxhY2siIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9ImJsYWNrIiBzdG9wLW9wYWNpdHk9IjAuMzgiLz4KICAgICAgICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICAgICAgPC9kZWZzPgogICAgICAgIDxyZWN0IHdpZHRoPSI1NjAiIGhlaWdodD0iNTYwIiBmaWxsPSJ1cmwoI3MxKSIvPgogICAgICAgIDxyZWN0IHg9IjAiIHk9IjQ4MCIgd2lkdGg9IjU2MCIgaGVpZ2h0PSI4MCIgZmlsbD0idXJsKCNzMikiIG9wYWNpdHk9IjAuODgiLz4KICAgICAgICA8cmVjdCB4PSIyMCIgeT0iMCIgd2lkdGg9IjUyMCIgaGVpZ2h0PSI1NjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICAgICAgPGxpbmUgeDE9IjIwIiB5MT0iMCIgeDI9IjU0MCIgeTI9IjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICAgIDxsaW5lIHgxPSIyMCIgeTE9IjEwMCIgeDI9IjU0MCIgeTI9IjEwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjE0LDkiLz4KICAgICAgICA8bGluZSB4MT0iMjAiIHkxPSIyMDAiIHgyPSI1NDAiIHkyPSIyMDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtZGFzaGFycmF5PSIxNCw5Ii8+CiAgICAgICAgPGxpbmUgeDE9IjIwIiB5MT0iMzAwIiB4Mj0iNTQwIiB5Mj0iMzAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWRhc2hhcnJheT0iMTQsOSIvPgogICAgICAgIDxsaW5lIHgxPSIyMCIgeTE9IjQwMCIgeDI9IjU0MCIgeTI9IjQwMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjE0LDkiLz4KICAgICAgICA8bGluZSB4MT0iMjAiIHkxPSI0ODAiIHgyPSI1NDAiIHkyPSI0ODAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICAgIDxsaW5lIHgxPSIyMCIgeTE9IjU1NiIgeDI9IjU0MCIgeTI9IjU1NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgICAgPGxpbmUgeDE9IjEwMCIgeTE9IjQ3NCIgeDI9IjEwMCIgeTI9IjQ4NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgICAgPGxpbmUgeDE9IjQ2MCIgeTE9IjQ3NCIgeDI9IjQ2MCIgeTI9IjQ4NiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICAgICAgPGcgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiPgogICAgICAgICAgPGxpbmUgeDE9IjE0IiB5MT0iMTAwIiB4Mj0iMjYiIHkyPSIxMDAiLz48bGluZSB4MT0iMTQiIHkxPSIyMDAiIHgyPSIyNiIgeTI9IjIwMCIvPgogICAgICAgICAgPGxpbmUgeDE9IjE0IiB5MT0iMzAwIiB4Mj0iMjYiIHkyPSIzMDAiLz48bGluZSB4MT0iMTQiIHkxPSI0MDAiIHgyPSIyNiIgeTI9IjQwMCIvPgogICAgICAgICAgPGxpbmUgeDE9IjUzNCIgeTE9IjEwMCIgeDI9IjU0NiIgeTI9IjEwMCIvPjxsaW5lIHgxPSI1MzQiIHkxPSIyMDAiIHgyPSI1NDYiIHkyPSIyMDAiLz4KICAgICAgICAgIDxsaW5lIHgxPSI1MzQiIHkxPSIzMDAiIHgyPSI1NDYiIHkyPSIzMDAiLz48bGluZSB4MT0iNTM0IiB5MT0iNDAwIiB4Mj0iNTQ2IiB5Mj0iNDAwIi8+CiAgICAgICAgPC9nPgogICAgICAgIDxsaW5lIHgxPSIyNTIiIHkxPSI1NTYiIHgyPSIyNTIiIHkyPSI1MDYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICAgIDxsaW5lIHgxPSIzMDgiIHkxPSI1NTYiIHgyPSIzMDgiIHkyPSI1MDYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICAgIDxsaW5lIHgxPSIyNTIiIHkxPSI1MjYiIHgyPSIzMDgiIHkyPSI1MjYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgICAgIDxsaW5lIHgxPSIyODAiIHkxPSI1MDYiIHgyPSIyODAiIHkyPSI0ODAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIvPgogICAgICAgIDxyZWN0IHg9IjI0NyIgeT0iNTUzIiB3aWR0aD0iMTAiIGhlaWdodD0iNiIgcng9IjIiIGZpbGw9IiNjYzIyMjIiLz4KICAgICAgICA8cmVjdCB4PSIzMDMiIHk9IjU1MyIgd2lkdGg9IjEwIiBoZWlnaHQ9IjYiIHJ4PSIyIiBmaWxsPSIjY2MyMjIyIi8+CiAgICAgICAgPGcgZm9udC1mYW1pbHk9InN5c3RlbS11aSxzYW5zLXNlcmlmIiBmb250LXNpemU9IjEzIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNDIpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4KICAgICAgICAgIDx0ZXh0IHg9IjQ0IiB5PSI4Ij41MG08L3RleHQ+PHRleHQgeD0iNDQiIHk9IjExNCI+NDBtPC90ZXh0Pjx0ZXh0IHg9IjQ0IiB5PSIyMTQiPjMwbTwvdGV4dD4KICAgICAgICAgIDx0ZXh0IHg9IjQ0IiB5PSIzMTQiPjIwbTwvdGV4dD48dGV4dCB4PSI0NCIgeT0iNDE0Ij4xMG08L3RleHQ+CiAgICAgICAgICA8dGV4dCB4PSI1MTYiIHk9IjgiPjUwbTwvdGV4dD48dGV4dCB4PSI1MTYiIHk9IjExNCI+NDBtPC90ZXh0Pjx0ZXh0IHg9IjUxNiIgeT0iMjE0Ij4zMG08L3RleHQ+CiAgICAgICAgICA8dGV4dCB4PSI1MTYiIHk9IjMxNCI+MjBtPC90ZXh0Pjx0ZXh0IHg9IjUxNiIgeT0iNDE0Ij4xMG08L3RleHQ+CiAgICAgICAgPC9nPgogICAgICAgIDxnIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+CiAgICAgICAgICA8dGV4dCB4PSIyODAiIHk9IjUyNCI+SU4tR09BTDwvdGV4dD4KICAgICAgICA8L2c+CiAgICAgICAgPGcgZm9udC1mYW1pbHk9InN5c3RlbS11aSxzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMzUpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4KICAgICAgICAgIDx0ZXh0IHg9IjI4MCIgeT0iNDc2Ij5UUlkgTElORTwvdGV4dD4KICAgICAgICA8L2c+CiAgICAgICAgPHJlY3Qgd2lkdGg9IjU2MCIgaGVpZ2h0PSI1NjAiIGZpbGw9InVybCgjdmlnKSIvPgogICAgICA8L3N2Zz4KCiAgICAgIDxkaXYgY2xhc3M9ImZpZWxkLXN1cmZhY2UiIGlkPSJmaWVsZC1zdXJmYWNlIj4KICAgICAgICA8c3ZnIGNsYXNzPSJhcnJvdy1zdmciIGlkPSJhcnJvdy1zdmciIHZpZXdCb3g9IjAgMCA1NjAgNTYwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIj48L3N2Zz4KICAgICAgICA8ZGl2IGNsYXNzPSJmaWVsZC1kcm9wLXpvbmUiIGlkPSJmaWVsZC1kcm9wLXpvbmUiPjwvZGl2PgogICAgICAgIDwhLS0gZGlzY3MgaW5qZWN0ZWQgaGVyZSAtLT4KICAgICAgPC9kaXY+CgogICAgICA8ZGl2IGNsYXNzPSJkcmF3LWhpbnQtYmFubmVyIiBpZD0iZHJhdy1oaW50IiBzdHlsZT0iZGlzcGxheTpub25lOyI+Q2xpY2sgYW55d2hlcmUgdG8gZHJhdyBhIHBhdGggZnJvbSB0aGlzIHBsYXllcjwvZGl2PgogICAgPC9kaXY+CiAgPC9kaXY+CgogIDwhLS0gUExBWVMgUEFORUwgLS0+CiAgPGRpdiBjbGFzcz0icGxheXMtcGFuZWwiPgogICAgPGg1PlNhdmVkIHBsYXlzPC9oNT4KICAgIDxkaXYgY2xhc3M9InBsYXlzLWxpc3QiIGlkPSJwbGF5cy1saXN0Ij4KICAgICAgPGRpdiBjbGFzcz0iZW1wdHktcGxheXMiIGlkPSJlbXB0eS1wbGF5cyI+Tm8gcGxheXMgc2F2ZWQgeWV0LiBCdWlsZCBvbmUsIHRoZW4gaGl0ICJTYXZlIHBsYXkiLjwvZGl2PgogICAgPC9kaXY+CiAgPC9kaXY+Cgo8L2Rpdj4KCjwhLS0gRXhwb3J0IG1vZGFsIC0tPgo8ZGl2IGNsYXNzPSJtb2RhbC1vdmVybGF5IiBpZD0iZXhwb3J0LW1vZGFsIj4KICA8ZGl2IGNsYXNzPSJtb2RhbCI+CiAgICA8aDM+RXhwb3J0IHBsYXk8L2gzPgogICAgPGRpdiBjbGFzcz0ibW9kYWwtcm93Ij4KICAgICAgPGJ1dHRvbiBpZD0iZXhwb3J0LXBuZyI+UE5HPC9idXR0b24+CiAgICAgIDxidXR0b24gaWQ9ImV4cG9ydC1qcGVnIj5KUEVHPC9idXR0b24+CiAgICA8L2Rpdj4KICAgIDxidXR0b24gaWQ9ImV4cG9ydC1jYW5jZWwiIHN0eWxlPSJiYWNrZ3JvdW5kOnRyYW5zcGFyZW50OyI+Q2FuY2VsPC9idXR0b24+CiAgPC9kaXY+CjwvZGl2Pgo8L2Rpdj4=";
const PLAY_CREATOR_JS_B64 = "KGZ1bmN0aW9uKCkgewoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIFJVR0JZIExFQUdVRSBQTEFZIENSRUFUT1IKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Cgpjb25zdCBWQiA9IDU2MDsgLy8gU1ZHIHZpZXdCb3ggaXMgNTYweDU2MCwgc3F1YXJlIGNvb3JkaW5hdGUgc3BhY2UKY29uc3QgRElTQ19TSVpFX01VTFRJUExJRVJTID0geyBzbWFsbDogMC43LCBtZWRpdW06IDEsIGxhcmdlOiAxLjMgfTsKCi8vIC0tLS0tLS0tLS0gU1RBVEUgLS0tLS0tLS0tLQpsZXQgZGlzY3MgPSBbXTsgICAgICAgIC8vIHsgaWQsIGtpbmQ6ICdudW1iZXInfCd4JywgbnVtYmVyLCB4LCB5IH0gIHgseSBpbiB2aWV3Qm94IHVuaXRzICgwLTU2MCkKbGV0IGFycm93cyA9IFtdOyAgICAgICAgLy8geyBpZCwgZnJvbURpc2NJZCwgeDEseTEsIHgyLHkyLCBjdXJ2ZWQsIGN0cmxYLCBjdHJsWSB9CmxldCBuZXh0RGlzY1VpZCA9IDE7CmxldCBuZXh0QXJyb3dVaWQgPSAxOwpsZXQgc2VsZWN0ZWREaXNjSWQgPSBudWxsOyAgIC8vIGRpc2MvbWFya2VyIHNlbGVjdGVkIGZvciAiY2xpY2sgZGVzdGluYXRpb24iIGFycm93IGRyYXdpbmcKbGV0IGFycm93U3R5bGVNb2RlID0gJ3N0cmFpZ2h0JzsgLy8gJ3N0cmFpZ2h0JyB8ICdjdXJ2ZWQnCmxldCBkcmFnZ2luZ0Rpc2NJZCA9IG51bGw7ICAgICAgIC8vIGRpc2MvbWFya2VyIGN1cnJlbnRseSBiZWluZyBkcmFnZ2VkIG9uIHRoZSBmaWVsZApsZXQgZHJhZ2dpbmdGcm9tVHJheSA9IG51bGw7ICAgICAvLyB7IGtpbmQ6ICdudW1iZXInLCBudW1iZXIgfSB8IHsga2luZDogJ3gnIH0gYmVpbmcgZHJhZ2dlZCBmcm9tIHRyYXkKbGV0IGRyYWdnaW5nQXJyb3dIYW5kbGUgPSBudWxsOyAgLy8ge2Fycm93SWR9IHdoZW4gZHJhZ2dpbmcgYSBjdXJ2ZSBoYW5kbGUKbGV0IGRpc2NTaXplTW9kZSA9ICdtZWRpdW0nOyAgICAgLy8gJ3NtYWxsJyB8ICdtZWRpdW0nIHwgJ2xhcmdlJwoKbGV0IHNhdmVkUGxheXMgPSAod2luZG93Ll9fcGxheUNyZWF0b3JJbml0aWFsUGxheXMgfHwgW10pLm1hcChwID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocCkpKTsgLy8geyBpZCwgbmFtZSwgdGh1bWIgKGRhdGFVUkwpLCBkaXNjcywgYXJyb3dzIH0KbGV0IGFjdGl2ZVBsYXlJZCA9IG51bGw7CgpmdW5jdGlvbiBub3RpZnlQbGF5c0NoYW5nZWQoKSB7CiAgaWYgKHR5cGVvZiB3aW5kb3cuX19wbGF5Q3JlYXRvck9uUGxheXNDaGFuZ2VkID09PSAnZnVuY3Rpb24nKSB7CiAgICB3aW5kb3cuX19wbGF5Q3JlYXRvck9uUGxheXNDaGFuZ2VkKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2F2ZWRQbGF5cykpKTsKICB9Cn0KCi8vIC0tLS0tLS0tLS0gRE9NIHJlZnMgLS0tLS0tLS0tLQpjb25zdCBmaWVsZFdyYXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmllbGQtd3JhcCcpOwpjb25zdCBmaWVsZFN1cmZhY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmllbGQtc3VyZmFjZScpOwpjb25zdCBhcnJvd1N2ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcnJvdy1zdmcnKTsKY29uc3QgZHJvcFpvbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmllbGQtZHJvcC16b25lJyk7CmNvbnN0IHRyYXlEaXNjcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0cmF5LWRpc2NzJyk7CmNvbnN0IGRyYXdIaW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RyYXctaGludCcpOwpjb25zdCBwbGF5c0xpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheXMtbGlzdCcpOwpjb25zdCBlbXB0eVBsYXlzTXNnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VtcHR5LXBsYXlzJyk7CmNvbnN0IHBsYXlOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheS1uYW1lJyk7CgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gVFJBWSDigJQgYnVpbGQgMTMgbnVtYmVyZWQgZGlzY3MKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CmZ1bmN0aW9uIGJ1aWxkVHJheSgpIHsKICB0cmF5RGlzY3MuaW5uZXJIVE1MID0gJyc7CiAgZm9yIChsZXQgbiA9IDE7IG4gPD0gMTM7IG4rKykgewogICAgY29uc3QgZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpOwogICAgZC5jbGFzc05hbWUgPSAndHJheS1kaXNjJzsKICAgIGQuZGF0YXNldC5udW1iZXIgPSBuOwogICAgZC50ZXh0Q29udGVudCA9IG47CiAgICBkLmRyYWdnYWJsZSA9IHRydWU7CiAgICBkLm9uZHJhZ3N0YXJ0ID0gKGUpID0+IHsKICAgICAgZHJhZ2dpbmdGcm9tVHJheSA9IHsga2luZDogJ251bWJlcicsIG51bWJlcjogbiB9OwogICAgICBlLmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknOwogICAgfTsKICAgIGQub25kcmFnZW5kID0gKCkgPT4geyBkcmFnZ2luZ0Zyb21UcmF5ID0gbnVsbDsgfTsKICAgIHRyYXlEaXNjcy5hcHBlbmRDaGlsZChkKTsKICB9CgogIC8vIFggbWFya2VyIOKAlCBhbHdheXMgZHJhZ2dhYmxlLCB1bmxpbWl0ZWQgcGxhY2VtZW50cyAobm8gImFscmVhZHkgcGxhY2VkIiBsb2Nrb3V0KQogIGNvbnN0IHhUaWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7CiAgeFRpbGUuY2xhc3NOYW1lID0gJ3RyYXktZGlzYyB0cmF5LWRpc2MteCc7CiAgeFRpbGUudGV4dENvbnRlbnQgPSAn4pyVJzsKICB4VGlsZS50aXRsZSA9ICdEcmFnIG9udG8gdGhlIGZpZWxkIHRvIG1hcmsgYSBwb3NpdGlvbic7CiAgeFRpbGUuZHJhZ2dhYmxlID0gdHJ1ZTsKICB4VGlsZS5vbmRyYWdzdGFydCA9IChlKSA9PiB7CiAgICBkcmFnZ2luZ0Zyb21UcmF5ID0geyBraW5kOiAneCcgfTsKICAgIGUuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnY29weSc7CiAgfTsKICB4VGlsZS5vbmRyYWdlbmQgPSAoKSA9PiB7IGRyYWdnaW5nRnJvbVRyYXkgPSBudWxsOyB9OwogIHRyYXlEaXNjcy5hcHBlbmRDaGlsZCh4VGlsZSk7CgogIHJlZnJlc2hUcmF5U3RhdGUoKTsKfQoKZnVuY3Rpb24gcmVmcmVzaFRyYXlTdGF0ZSgpIHsKICBjb25zdCBwbGFjZWROdW1iZXJzID0gbmV3IFNldChkaXNjcy5maWx0ZXIoZCA9PiBkLmtpbmQgIT09ICd4JykubWFwKGQgPT4gZC5udW1iZXIpKTsKICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJheS1kaXNjOm5vdCgudHJheS1kaXNjLXgpJykuZm9yRWFjaChlbCA9PiB7CiAgICBjb25zdCBuID0gcGFyc2VJbnQoZWwuZGF0YXNldC5udW1iZXIsIDEwKTsKICAgIGNvbnN0IGlzUGxhY2VkID0gcGxhY2VkTnVtYmVycy5oYXMobik7CiAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdwbGFjZWQnLCBpc1BsYWNlZCk7CiAgICBlbC5kcmFnZ2FibGUgPSAhaXNQbGFjZWQ7CiAgfSk7Cn0KCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBDT09SRElOQVRFIEhFTFBFUlMKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIENvbnZlcnQgYSBtb3VzZS9wb2ludGVyIGNsaWVudCBldmVudCB0byB2aWV3Qm94IGNvb3JkaW5hdGVzICgwLTU2MCBzcGFjZSkKZnVuY3Rpb24gY2xpZW50VG9WaWV3Qm94KGNsaWVudFgsIGNsaWVudFkpIHsKICBjb25zdCByZWN0ID0gZmllbGRTdXJmYWNlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOwogIGNvbnN0IHhGcmFjID0gKGNsaWVudFggLSByZWN0LmxlZnQpIC8gcmVjdC53aWR0aDsKICBjb25zdCB5RnJhYyA9IChjbGllbnRZIC0gcmVjdC50b3ApIC8gcmVjdC5oZWlnaHQ7CiAgcmV0dXJuIHsKICAgIHg6IE1hdGgubWF4KDAsIE1hdGgubWluKFZCLCB4RnJhYyAqIFZCKSksCiAgICB5OiBNYXRoLm1heCgwLCBNYXRoLm1pbihWQiwgeUZyYWMgKiBWQikpCiAgfTsKfQpmdW5jdGlvbiB2aWV3Qm94VG9QY3QodikgewogIHJldHVybiAodiAvIFZCKSAqIDEwMDsKfQoKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIERJU0NTIOKAlCByZW5kZXIgJiBpbnRlcmFjdAovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KZnVuY3Rpb24gcmVuZGVyRGlzY3MoKSB7CiAgc3luY0Fycm93c1RvRGlzY3MoKTsKCiAgLy8gcmVtb3ZlIG9sZCBkaXNjL21hcmtlciBlbGVtZW50cwogIGZpZWxkU3VyZmFjZS5xdWVyeVNlbGVjdG9yQWxsKCcuZmllbGQtZGlzYycpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpOwoKICBkaXNjcy5mb3JFYWNoKGRpc2MgPT4gewogICAgY29uc3QgaXNYID0gZGlzYy5raW5kID09PSAneCc7CiAgICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpOwogICAgZWwuY2xhc3NOYW1lID0gaXNYID8gJ2ZpZWxkLWRpc2MgZmllbGQtZGlzYy14JyA6ICdmaWVsZC1kaXNjJzsKICAgIGVsLmRhdGFzZXQuZGlzY0lkID0gZGlzYy5pZDsKICAgIGVsLnN0eWxlLmxlZnQgPSB2aWV3Qm94VG9QY3QoZGlzYy54KSArICclJzsKICAgIGVsLnN0eWxlLnRvcCA9IHZpZXdCb3hUb1BjdChkaXNjLnkpICsgJyUnOwogICAgZWwudGV4dENvbnRlbnQgPSBpc1ggPyAn4pyVJyA6IGRpc2MubnVtYmVyOwogICAgaWYgKGRpc2MuaWQgPT09IHNlbGVjdGVkRGlzY0lkKSBlbC5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpOwoKICAgIGNvbnN0IHJlbW92ZUJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpOwogICAgcmVtb3ZlQnRuLmNsYXNzTmFtZSA9ICdyZW1vdmUtZGlzYyc7CiAgICByZW1vdmVCdG4udGV4dENvbnRlbnQgPSAn4pyVJzsKICAgIHJlbW92ZUJ0bi50aXRsZSA9IGlzWCA/ICdSZW1vdmUgbWFya2VyJyA6ICdSZW1vdmUgcGxheWVyJzsKICAgIHJlbW92ZUJ0bi5vbmNsaWNrID0gKGUpID0+IHsKICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsKICAgICAgcmVtb3ZlRGlzYyhkaXNjLmlkKTsKICAgIH07CiAgICBlbC5hcHBlbmRDaGlsZChyZW1vdmVCdG4pOwoKICAgIC8vIERyYWdnaW5nIGFuIGV4aXN0aW5nIGRpc2MgdG8gcmVwb3NpdGlvbgogICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKGUpID0+IHsKICAgICAgaWYgKGUudGFyZ2V0ID09PSByZW1vdmVCdG4pIHJldHVybjsKICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOwogICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOwogICAgICBkcmFnZ2luZ0Rpc2NJZCA9IGRpc2MuaWQ7CiAgICAgIGxldCBtb3ZlZCA9IGZhbHNlOwogICAgICBjb25zdCBvbk1vdmUgPSAoZXYpID0+IHsKICAgICAgICBtb3ZlZCA9IHRydWU7CiAgICAgICAgY29uc3QgcG9zID0gY2xpZW50VG9WaWV3Qm94KGV2LmNsaWVudFgsIGV2LmNsaWVudFkpOwogICAgICAgIGNvbnN0IGQgPSBkaXNjcy5maW5kKHggPT4geC5pZCA9PT0gZGlzYy5pZCk7CiAgICAgICAgZC54ID0gcG9zLng7IGQueSA9IHBvcy55OwogICAgICAgIHJlbmRlckRpc2NzKCk7CiAgICAgICAgcmVuZGVyQXJyb3dzKCk7CiAgICAgIH07CiAgICAgIGNvbnN0IG9uVXAgPSAoZXYpID0+IHsKICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUpOwogICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvblVwKTsKICAgICAgICBkcmFnZ2luZ0Rpc2NJZCA9IG51bGw7CiAgICAgICAgaWYgKCFtb3ZlZCkgewogICAgICAgICAgLy8gaXQgd2FzIGEgY2xpY2ssIG5vdCBhIGRyYWcgLT4gaGFuZGxlIHNlbGVjdGlvbiBsb2dpYwogICAgICAgICAgaGFuZGxlRGlzY0NsaWNrKGRpc2MuaWQpOwogICAgICAgIH0KICAgICAgfTsKICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3ZlKTsKICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uVXApOwogICAgfSk7CgogICAgLy8gdG91Y2ggc3VwcG9ydAogICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIChlKSA9PiB7CiAgICAgIGlmIChlLnRhcmdldCA9PT0gcmVtb3ZlQnRuKSByZXR1cm47CiAgICAgIGUucHJldmVudERlZmF1bHQoKTsKICAgICAgY29uc3QgdG91Y2ggPSBlLnRvdWNoZXNbMF07CiAgICAgIGxldCBtb3ZlZCA9IGZhbHNlOwogICAgICBjb25zdCBvbk1vdmUgPSAoZXYpID0+IHsKICAgICAgICBtb3ZlZCA9IHRydWU7CiAgICAgICAgY29uc3QgdCA9IGV2LnRvdWNoZXNbMF07CiAgICAgICAgY29uc3QgcG9zID0gY2xpZW50VG9WaWV3Qm94KHQuY2xpZW50WCwgdC5jbGllbnRZKTsKICAgICAgICBjb25zdCBkID0gZGlzY3MuZmluZCh4ID0+IHguaWQgPT09IGRpc2MuaWQpOwogICAgICAgIGQueCA9IHBvcy54OyBkLnkgPSBwb3MueTsKICAgICAgICByZW5kZXJEaXNjcygpOwogICAgICAgIHJlbmRlckFycm93cygpOwogICAgICB9OwogICAgICBjb25zdCBvbkVuZCA9ICgpID0+IHsKICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvbk1vdmUpOwogICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25FbmQpOwogICAgICAgIGlmICghbW92ZWQpIGhhbmRsZURpc2NDbGljayhkaXNjLmlkKTsKICAgICAgfTsKICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Nb3ZlLCB7IHBhc3NpdmU6IGZhbHNlIH0pOwogICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uRW5kKTsKICAgIH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7CgogICAgZmllbGRTdXJmYWNlLmFwcGVuZENoaWxkKGVsKTsKICB9KTsKCiAgcmVmcmVzaFRyYXlTdGF0ZSgpOwp9CgpmdW5jdGlvbiByZW1vdmVEaXNjKGRpc2NJZCkgewogIGRpc2NzID0gZGlzY3MuZmlsdGVyKGQgPT4gZC5pZCAhPT0gZGlzY0lkKTsKICBhcnJvd3MgPSBhcnJvd3MuZmlsdGVyKGEgPT4gYS5mcm9tRGlzY0lkICE9PSBkaXNjSWQpOwogIGlmIChzZWxlY3RlZERpc2NJZCA9PT0gZGlzY0lkKSB7CiAgICBzZWxlY3RlZERpc2NJZCA9IG51bGw7CiAgICBkcmF3SGludC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOwogIH0KICByZW5kZXJEaXNjcygpOwogIHJlbmRlckFycm93cygpOwp9CgpmdW5jdGlvbiBoYW5kbGVEaXNjQ2xpY2soZGlzY0lkKSB7CiAgaWYgKHNlbGVjdGVkRGlzY0lkID09PSBkaXNjSWQpIHsKICAgIC8vIGNsaWNraW5nIHRoZSBzYW1lIGRpc2MgYWdhaW4gZGVzZWxlY3RzCiAgICBzZWxlY3RlZERpc2NJZCA9IG51bGw7CiAgICBkcmF3SGludC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOwogIH0gZWxzZSB7CiAgICBzZWxlY3RlZERpc2NJZCA9IGRpc2NJZDsKICAgIGRyYXdIaW50LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snOwogIH0KICByZW5kZXJEaXNjcygpOwp9CgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KLy8gRFJPUCBaT05FIOKAlCBkcmFnIGRpc2MgZnJvbSB0cmF5IG9udG8gZmllbGQKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CmRyb3Bab25lLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgKGUpID0+IHsKICBlLnByZXZlbnREZWZhdWx0KCk7CiAgZHJvcFpvbmUuY2xhc3NMaXN0LmFkZCgnZHJhZy1hY3RpdmUnKTsKfSk7CmRyb3Bab25lLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsICgpID0+IHsKICBkcm9wWm9uZS5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnLWFjdGl2ZScpOwp9KTsKZHJvcFpvbmUuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIChlKSA9PiB7CiAgZS5wcmV2ZW50RGVmYXVsdCgpOwogIGRyb3Bab25lLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWctYWN0aXZlJyk7CiAgaWYgKGRyYWdnaW5nRnJvbVRyYXkgPT0gbnVsbCkgcmV0dXJuOwogIGNvbnN0IHBvcyA9IGNsaWVudFRvVmlld0JveChlLmNsaWVudFgsIGUuY2xpZW50WSk7CiAgaWYgKGRyYWdnaW5nRnJvbVRyYXkua2luZCA9PT0gJ3gnKSB7CiAgICBkaXNjcy5wdXNoKHsgaWQ6ICdkaXNjLScgKyAobmV4dERpc2NVaWQrKyksIGtpbmQ6ICd4JywgeDogcG9zLngsIHk6IHBvcy55IH0pOwogIH0gZWxzZSB7CiAgICBjb25zdCBhbHJlYWR5UGxhY2VkID0gZGlzY3Muc29tZShkID0+IGQua2luZCAhPT0gJ3gnICYmIGQubnVtYmVyID09PSBkcmFnZ2luZ0Zyb21UcmF5Lm51bWJlcik7CiAgICBpZiAoYWxyZWFkeVBsYWNlZCkgeyBkcmFnZ2luZ0Zyb21UcmF5ID0gbnVsbDsgcmV0dXJuOyB9CiAgICBkaXNjcy5wdXNoKHsgaWQ6ICdkaXNjLScgKyAobmV4dERpc2NVaWQrKyksIGtpbmQ6ICdudW1iZXInLCBudW1iZXI6IGRyYWdnaW5nRnJvbVRyYXkubnVtYmVyLCB4OiBwb3MueCwgeTogcG9zLnkgfSk7CiAgfQogIGRyYWdnaW5nRnJvbVRyYXkgPSBudWxsOwogIHJlbmRlckRpc2NzKCk7Cn0pOwoKLy8gQ2xpY2sgb24gZW1wdHkgZmllbGQ6Ci8vIC0gaWYgYSBkaXNjIGlzIHNlbGVjdGVkIC0+IGRyYXcgYW4gYXJyb3cgZnJvbSB0aGF0IGRpc2MgdG8gdGhpcyBwb2ludAovLyAtIGVsc2UgLT4gbm8tb3AKZHJvcFpvbmUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4gewogIGlmICghc2VsZWN0ZWREaXNjSWQpIHJldHVybjsKICBjb25zdCBmcm9tRGlzYyA9IGRpc2NzLmZpbmQoZCA9PiBkLmlkID09PSBzZWxlY3RlZERpc2NJZCk7CiAgaWYgKCFmcm9tRGlzYykgcmV0dXJuOwogIGNvbnN0IHBvcyA9IGNsaWVudFRvVmlld0JveChlLmNsaWVudFgsIGUuY2xpZW50WSk7CgogIGNvbnN0IGFycm93ID0gewogICAgaWQ6ICdhcnJvdy0nICsgKG5leHRBcnJvd1VpZCsrKSwKICAgIGZyb21EaXNjSWQ6IGZyb21EaXNjLmlkLAogICAgeDE6IGZyb21EaXNjLngsIHkxOiBmcm9tRGlzYy55LAogICAgeDI6IHBvcy54LCB5MjogcG9zLnksCiAgICBjdXJ2ZWQ6IGFycm93U3R5bGVNb2RlID09PSAnY3VydmVkJwogIH07CiAgaWYgKGFycm93LmN1cnZlZCkgewogICAgLy8gZGVmYXVsdCBjb250cm9sIHBvaW50IG9mZnNldCBwZXJwZW5kaWN1bGFyIHRvIHRoZSBsaW5lLCBmb3IgYSB2aXNpYmxlIGN1cnZlCiAgICBjb25zdCBteCA9IChhcnJvdy54MSArIGFycm93LngyKSAvIDI7CiAgICBjb25zdCBteSA9IChhcnJvdy55MSArIGFycm93LnkyKSAvIDI7CiAgICBjb25zdCBkeCA9IGFycm93LngyIC0gYXJyb3cueDE7CiAgICBjb25zdCBkeSA9IGFycm93LnkyIC0gYXJyb3cueTE7CiAgICBjb25zdCBsZW4gPSBNYXRoLmh5cG90KGR4LCBkeSkgfHwgMTsKICAgIGNvbnN0IG54ID0gLWR5IC8gbGVuLCBueSA9IGR4IC8gbGVuOyAvLyBub3JtYWwKICAgIGNvbnN0IGJlbmQgPSBNYXRoLm1pbig2MCwgbGVuICogMC4zNSk7CiAgICBhcnJvdy5jdHJsWCA9IG14ICsgbnggKiBiZW5kOwogICAgYXJyb3cuY3RybFkgPSBteSArIG55ICogYmVuZDsKICB9CiAgYXJyb3dzLnB1c2goYXJyb3cpOwoKICAvLyBkZXNlbGVjdCBhZnRlciBkcmF3aW5nIChvbmUgYXJyb3cgcGVyIGNsaWNrLWNsaWNrIGFjdGlvbikKICBzZWxlY3RlZERpc2NJZCA9IG51bGw7CiAgZHJhd0hpbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJzsKICByZW5kZXJEaXNjcygpOwogIHJlbmRlckFycm93cygpOwp9KTsKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBBUlJPV1Mg4oCUIHJlbmRlciB3aXRoIGFycm93aGVhZHMsIGRyYWdnYWJsZSBjdXJ2ZSBoYW5kbGVzCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQpmdW5jdGlvbiBlbnN1cmVBcnJvd01hcmtlcigpIHsKICBpZiAoYXJyb3dTdmcucXVlcnlTZWxlY3RvcignI2Fycm93aGVhZCcpKSByZXR1cm47CiAgY29uc3QgZGVmcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnZGVmcycpOwogIGRlZnMuaW5uZXJIVE1MID0gYAogICAgPG1hcmtlciBpZD0iYXJyb3doZWFkIiBtYXJrZXJXaWR0aD0iOSIgbWFya2VySGVpZ2h0PSI5IiByZWZYPSI3IiByZWZZPSI0LjUiIG9yaWVudD0iYXV0byIgbWFya2VyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTTAsMCBMOSw0LjUgTDAsOSBaIiBmaWxsPSIjZmZmZmZmIi8+CiAgICA8L21hcmtlcj4KICAgIDxtYXJrZXIgaWQ9ImFycm93aGVhZC1jdXJ2ZWQiIG1hcmtlcldpZHRoPSI5IiBtYXJrZXJIZWlnaHQ9IjkiIHJlZlg9IjciIHJlZlk9IjQuNSIgb3JpZW50PSJhdXRvIiBtYXJrZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8cGF0aCBkPSJNMCwwIEw5LDQuNSBMMCw5IFoiIGZpbGw9IiM1Y2M4ZTgiLz4KICAgIDwvbWFya2VyPgogIGA7CiAgYXJyb3dTdmcuYXBwZW5kQ2hpbGQoZGVmcyk7Cn0KCmZ1bmN0aW9uIHJlbmRlckFycm93cygpIHsKICBlbnN1cmVBcnJvd01hcmtlcigpOwogIC8vIHJlbW92ZSBvbGQgcGF0aHMvaGFuZGxlcyAoa2VlcCBkZWZzKQogIGFycm93U3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnJvdy1wYXRoLCAuYXJyb3ctaGFuZGxlLCAuYXJyb3ctaGl0JykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7CgogIGFycm93cy5mb3JFYWNoKGFycm93ID0+IHsKICAgIGNvbnN0IG5zID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJzsKCiAgICAvLyB2aXNpYmxlIHBhdGgKICAgIGNvbnN0IHBhdGggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdwYXRoJyk7CiAgICBsZXQgZDsKICAgIGlmIChhcnJvdy5jdXJ2ZWQpIHsKICAgICAgZCA9IGBNICR7YXJyb3cueDF9ICR7YXJyb3cueTF9IFEgJHthcnJvdy5jdHJsWH0gJHthcnJvdy5jdHJsWX0gJHthcnJvdy54Mn0gJHthcnJvdy55Mn1gOwogICAgfSBlbHNlIHsKICAgICAgZCA9IGBNICR7YXJyb3cueDF9ICR7YXJyb3cueTF9IEwgJHthcnJvdy54Mn0gJHthcnJvdy55Mn1gOwogICAgfQogICAgcGF0aC5zZXRBdHRyaWJ1dGUoJ2QnLCBkKTsKICAgIHBhdGguc2V0QXR0cmlidXRlKCdjbGFzcycsICdhcnJvdy1wYXRoJyArIChhcnJvdy5jdXJ2ZWQgPyAnIGN1cnZlZCcgOiAnJykpOwogICAgcGF0aC5zZXRBdHRyaWJ1dGUoJ21hcmtlci1lbmQnLCBhcnJvdy5jdXJ2ZWQgPyAndXJsKCNhcnJvd2hlYWQtY3VydmVkKScgOiAndXJsKCNhcnJvd2hlYWQpJyk7CiAgICBwYXRoLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnc3Ryb2tlJzsKICAgIHBhdGgudGl0bGUgPSAnQ2xpY2sgdG8gZGVsZXRlIHRoaXMgcGF0aCc7CiAgICBwYXRoLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHsKICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsKICAgICAgYXJyb3dzID0gYXJyb3dzLmZpbHRlcihhID0+IGEuaWQgIT09IGFycm93LmlkKTsKICAgICAgcmVuZGVyQXJyb3dzKCk7CiAgICB9KTsKICAgIGFycm93U3ZnLmFwcGVuZENoaWxkKHBhdGgpOwoKICAgIC8vIGRyYWdnYWJsZSBjdXJ2ZS1iZW5kIGhhbmRsZSAob25seSBmb3IgY3VydmVkIGFycm93cykKICAgIGlmIChhcnJvdy5jdXJ2ZWQpIHsKICAgICAgY29uc3QgaGFuZGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCAnY2lyY2xlJyk7CiAgICAgIGhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2N4JywgYXJyb3cuY3RybFgpOwogICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCdjeScsIGFycm93LmN0cmxZKTsKICAgICAgaGFuZGxlLnNldEF0dHJpYnV0ZSgncicsIDYpOwogICAgICBoYW5kbGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhcnJvdy1oYW5kbGUnKTsKICAgICAgaGFuZGxlLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnYWxsJzsKICAgICAgaGFuZGxlLnRpdGxlID0gJ0RyYWcgdG8gYmVuZCB0aGUgY3VydmUnOwogICAgICBoYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKGUpID0+IHsKICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsKICAgICAgICBjb25zdCBvbk1vdmUgPSAoZXYpID0+IHsKICAgICAgICAgIGNvbnN0IHBvcyA9IGNsaWVudFRvVmlld0JveChldi5jbGllbnRYLCBldi5jbGllbnRZKTsKICAgICAgICAgIGFycm93LmN0cmxYID0gcG9zLng7IGFycm93LmN0cmxZID0gcG9zLnk7CiAgICAgICAgICByZW5kZXJBcnJvd3MoKTsKICAgICAgICB9OwogICAgICAgIGNvbnN0IG9uVXAgPSAoKSA9PiB7CiAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUpOwogICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uVXApOwogICAgICAgIH07CiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3ZlKTsKICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25VcCk7CiAgICAgIH0pOwogICAgICBhcnJvd1N2Zy5hcHBlbmRDaGlsZChoYW5kbGUpOwogICAgfQoKICAgIC8vIGRyYWdnYWJsZSBlbmRwb2ludCBoYW5kbGUgKHRpcCB0aGUgYXJyb3cgcG9pbnRzIHRvKSDigJQgd29ya3MgZm9yIHN0cmFpZ2h0ICsgY3VydmVkCiAgICBjb25zdCBlbmRIYW5kbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdjaXJjbGUnKTsKICAgIGVuZEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2N4JywgYXJyb3cueDIpOwogICAgZW5kSGFuZGxlLnNldEF0dHJpYnV0ZSgnY3knLCBhcnJvdy55Mik7CiAgICBlbmRIYW5kbGUuc2V0QXR0cmlidXRlKCdyJywgNi41KTsKICAgIGVuZEhhbmRsZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2Fycm93LWhhbmRsZSBlbmRwb2ludCcpOwogICAgZW5kSGFuZGxlLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnYWxsJzsKICAgIGVuZEhhbmRsZS50aXRsZSA9ICdEcmFnIHRvIHJlcG9pbnQgdGhpcyBhcnJvdyc7CiAgICBlbmRIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKGUpID0+IHsKICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOwogICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOwogICAgICBjb25zdCBvbk1vdmUgPSAoZXYpID0+IHsKICAgICAgICBjb25zdCBwb3MgPSBjbGllbnRUb1ZpZXdCb3goZXYuY2xpZW50WCwgZXYuY2xpZW50WSk7CiAgICAgICAgYXJyb3cueDIgPSBwb3MueDsgYXJyb3cueTIgPSBwb3MueTsKICAgICAgICByZW5kZXJBcnJvd3MoKTsKICAgICAgfTsKICAgICAgY29uc3Qgb25VcCA9ICgpID0+IHsKICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdmUpOwogICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvblVwKTsKICAgICAgfTsKICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3ZlKTsKICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uVXApOwogICAgfSk7CiAgICBhcnJvd1N2Zy5hcHBlbmRDaGlsZChlbmRIYW5kbGUpOwogIH0pOwp9CgovLyBrZWVwIGFycm93cyBhdHRhY2hlZCB0byB0aGVpciBvcmlnaW4gZGlzYyBhcyBpdCBtb3ZlcwpmdW5jdGlvbiBzeW5jQXJyb3dzVG9EaXNjcygpIHsKICBhcnJvd3MuZm9yRWFjaChhcnJvdyA9PiB7CiAgICBjb25zdCBkaXNjID0gZGlzY3MuZmluZChkID0+IGQuaWQgPT09IGFycm93LmZyb21EaXNjSWQpOwogICAgaWYgKGRpc2MpIHsKICAgICAgY29uc3QgZHggPSBkaXNjLnggLSBhcnJvdy54MTsKICAgICAgY29uc3QgZHkgPSBkaXNjLnkgLSBhcnJvdy55MTsKICAgICAgYXJyb3cueDEgPSBkaXNjLng7CiAgICAgIGFycm93LnkxID0gZGlzYy55OwogICAgICBpZiAoYXJyb3cuY3VydmVkKSB7CiAgICAgICAgYXJyb3cuY3RybFggKz0gZHg7IGFycm93LmN0cmxZICs9IGR5OwogICAgICB9CiAgICB9CiAgfSk7Cn0KCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBUT1AgQkFSIEFDVElPTlMKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcnJvdy1zdHlsZS10b2dnbGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7CiAgY29uc3QgYnRuID0gZS50YXJnZXQuY2xvc2VzdCgnYnV0dG9uJyk7CiAgaWYgKCFidG4pIHJldHVybjsKICBhcnJvd1N0eWxlTW9kZSA9IGJ0bi5kYXRhc2V0LnN0eWxlOwogIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyNhcnJvdy1zdHlsZS10b2dnbGUgYnV0dG9uJykuZm9yRWFjaChiID0+IGIuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgYiA9PT0gYnRuKSk7Cn0pOwoKY29uc3QgZGlzY1NpemVUb2dnbGVFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjLXNpemUtdG9nZ2xlJyk7CmlmIChkaXNjU2l6ZVRvZ2dsZUVsKSB7CiAgZGlzY1NpemVUb2dnbGVFbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7CiAgICBjb25zdCBidG4gPSBlLnRhcmdldC5jbG9zZXN0KCdidXR0b24nKTsKICAgIGlmICghYnRuKSByZXR1cm47CiAgICBkaXNjU2l6ZU1vZGUgPSBidG4uZGF0YXNldC5zaXplOwogICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnI2Rpc2Mtc2l6ZS10b2dnbGUgYnV0dG9uJykuZm9yRWFjaChiID0+IGIuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgYiA9PT0gYnRuKSk7CiAgICBhcHBseURpc2NTaXplTW9kZSgpOwogIH0pOwp9CgpmdW5jdGlvbiBhcHBseURpc2NTaXplTW9kZSgpIHsKICBjb25zdCBtdWx0ID0gRElTQ19TSVpFX01VTFRJUExJRVJTW2Rpc2NTaXplTW9kZV0gfHwgMTsKICBmaWVsZFdyYXAuc3R5bGUuc2V0UHJvcGVydHkoJy0tcGMtZGlzYy1zaXplJywgKDQwICogbXVsdCkgKyAncHgnKTsKICBmaWVsZFdyYXAuc3R5bGUuc2V0UHJvcGVydHkoJy0tcGMtZGlzYy1mb250JywgKDE1ICogbXVsdCkgKyAncHgnKTsKfQoKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VuZG8tYXJyb3ctYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7CiAgYXJyb3dzLnBvcCgpOwogIHJlbmRlckFycm93cygpOwp9KTsKCmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjbGVhci1idG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsKICBpZiAoIWRpc2NzLmxlbmd0aCAmJiAhYXJyb3dzLmxlbmd0aCkgcmV0dXJuOwogIGlmIChjb25maXJtKCdDbGVhciBhbGwgcGxheWVycyBhbmQgcGF0aHMgZnJvbSB0aGUgZmllbGQ/JykpIHsKICAgIGRpc2NzID0gW107CiAgICBhcnJvd3MgPSBbXTsKICAgIHNlbGVjdGVkRGlzY0lkID0gbnVsbDsKICAgIGRyYXdIaW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7CiAgICByZW5kZXJEaXNjcygpOwogICAgcmVuZGVyQXJyb3dzKCk7CiAgfQp9KTsKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBTQVZFIC8gTE9BRCBQTEFZUwovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KZnVuY3Rpb24gcmVuZGVyUGxheXNMaXN0KCkgewogIHBsYXlzTGlzdC5xdWVyeVNlbGVjdG9yQWxsKCcucGxheS1jYXJkJykuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7CiAgZW1wdHlQbGF5c01zZy5zdHlsZS5kaXNwbGF5ID0gc2F2ZWRQbGF5cy5sZW5ndGggPyAnbm9uZScgOiAnYmxvY2snOwoKICBzYXZlZFBsYXlzLmZvckVhY2gocGxheSA9PiB7CiAgICBjb25zdCBjYXJkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7CiAgICBjYXJkLmNsYXNzTmFtZSA9ICdwbGF5LWNhcmQnICsgKHBsYXkuaWQgPT09IGFjdGl2ZVBsYXlJZCA/ICcgYWN0aXZlJyA6ICcnKTsKICAgIGNhcmQuaW5uZXJIVE1MID0gYAogICAgICA8aW1nIGNsYXNzPSJ0aHVtYiIgc3JjPSIke3BsYXkudGh1bWJ9IiBhbHQ9IiR7cGxheS5uYW1lfSIvPgogICAgICA8ZGl2IGNsYXNzPSJtZXRhIj4KICAgICAgICA8c3BhbiBjbGFzcz0ibmFtZSI+JHtwbGF5Lm5hbWV9PC9zcGFuPgogICAgICAgIDxzcGFuIGNsYXNzPSJkZWwiIHRpdGxlPSJEZWxldGUgcGxheSI+4pyVPC9zcGFuPgogICAgICA8L2Rpdj4KICAgIGA7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy50aHVtYicpLm9uY2xpY2sgPSAoKSA9PiBsb2FkUGxheShwbGF5LmlkKTsKICAgIGNhcmQucXVlcnlTZWxlY3RvcignLm5hbWUnKS5vbmNsaWNrID0gKCkgPT4gbG9hZFBsYXkocGxheS5pZCk7CiAgICBjYXJkLnF1ZXJ5U2VsZWN0b3IoJy5kZWwnKS5vbmNsaWNrID0gKGUpID0+IHsKICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsKICAgICAgaWYgKGNvbmZpcm0oYERlbGV0ZSAiJHtwbGF5Lm5hbWV9Ij9gKSkgewogICAgICAgIHNhdmVkUGxheXMgPSBzYXZlZFBsYXlzLmZpbHRlcihwID0+IHAuaWQgIT09IHBsYXkuaWQpOwogICAgICAgIGlmIChhY3RpdmVQbGF5SWQgPT09IHBsYXkuaWQpIGFjdGl2ZVBsYXlJZCA9IG51bGw7CiAgICAgICAgcmVuZGVyUGxheXNMaXN0KCk7CiAgICAgICAgbm90aWZ5UGxheXNDaGFuZ2VkKCk7CiAgICAgIH0KICAgIH07CiAgICBwbGF5c0xpc3QuYXBwZW5kQ2hpbGQoY2FyZCk7CiAgfSk7Cn0KCmZ1bmN0aW9uIGxvYWRQbGF5KHBsYXlJZCkgewogIGNvbnN0IHBsYXkgPSBzYXZlZFBsYXlzLmZpbmQocCA9PiBwLmlkID09PSBwbGF5SWQpOwogIGlmICghcGxheSkgcmV0dXJuOwogIGRpc2NzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwbGF5LmRpc2NzKSk7CiAgYXJyb3dzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShwbGF5LmFycm93cykpOwogIHBsYXlOYW1lSW5wdXQudmFsdWUgPSBwbGF5Lm5hbWU7CiAgYWN0aXZlUGxheUlkID0gcGxheUlkOwogIHNlbGVjdGVkRGlzY0lkID0gbnVsbDsKICBkcmF3SGludC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOwogIHJlbmRlckRpc2NzKCk7CiAgcmVuZGVyQXJyb3dzKCk7CiAgcmVuZGVyUGxheXNMaXN0KCk7Cn0KCmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlLWJ0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4gewogIGNvbnN0IG5hbWUgPSBwbGF5TmFtZUlucHV0LnZhbHVlLnRyaW0oKSB8fCAnVW50aXRsZWQgcGxheSc7CgogIC8vIEdlbmVyYXRlIGEgdGh1bWJuYWlsLCBidXQgbmV2ZXIgbGV0IGEgdGh1bWJuYWlsIGZhaWx1cmUgYmxvY2sgdGhlIHNhdmUg4oCUCiAgLy8gdGhlIHBsYXkgZGF0YSBpdHNlbGYgaXMgd2hhdCBtYXR0ZXJzLiBGYWxsIGJhY2sgdG8gYSBibGFuayBwbGFjZWhvbGRlci4KICBsZXQgdGh1bWIgPSBGQUxMQkFDS19USFVNQjsKICB0cnkgewogICAgdGh1bWIgPSBhd2FpdCByYXN0ZXJpemVGaWVsZCgyODAsIDI4MCwgJ3BuZycpOwogIH0gY2F0Y2ggKGVycikgewogICAgY29uc29sZS5lcnJvcignVGh1bWJuYWlsIGdlbmVyYXRpb24gZmFpbGVkLCBzYXZpbmcgd2l0aG91dCBpdDonLCBlcnIpOwogIH0KCiAgdHJ5IHsKICAgIGNvbnN0IGFjdGl2ZVBsYXkgPSBhY3RpdmVQbGF5SWQgPyBzYXZlZFBsYXlzLmZpbmQocCA9PiBwLmlkID09PSBhY3RpdmVQbGF5SWQpIDogbnVsbDsKCiAgICAvLyBVcGRhdGUgaW4gcGxhY2Ugb25seSBpZiB3ZSdyZSByZS1zYXZpbmcgdGhlIFNBTUUgcGxheSB1bmRlciB0aGUgU0FNRSBuYW1lLgogICAgLy8gQW55IG5ldyBuYW1lIChvciBubyBhY3RpdmUgcGxheSkgY3JlYXRlcyBhIGJyYW5kIG5ldyBzYXZlZCBwbGF5IGluc3RlYWQKICAgIC8vIG9mIHNpbGVudGx5IG92ZXJ3cml0aW5nIHdoYXRldmVyIHdhcyBsb2FkZWQuCiAgICBpZiAoYWN0aXZlUGxheSAmJiBhY3RpdmVQbGF5Lm5hbWUgPT09IG5hbWUpIHsKICAgICAgYWN0aXZlUGxheS5kaXNjcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGlzY3MpKTsKICAgICAgYWN0aXZlUGxheS5hcnJvd3MgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGFycm93cykpOwogICAgICBhY3RpdmVQbGF5LnRodW1iID0gdGh1bWI7CiAgICB9IGVsc2UgewogICAgICBjb25zdCBuZXdQbGF5ID0gewogICAgICAgIGlkOiAncGxheS0nICsgRGF0ZS5ub3coKSArICctJyArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDcpLAogICAgICAgIG5hbWUsCiAgICAgICAgdGh1bWIsCiAgICAgICAgZGlzY3M6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGlzY3MpKSwKICAgICAgICBhcnJvd3M6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXJyb3dzKSkKICAgICAgfTsKICAgICAgc2F2ZWRQbGF5cy51bnNoaWZ0KG5ld1BsYXkpOwogICAgICBhY3RpdmVQbGF5SWQgPSBuZXdQbGF5LmlkOwogICAgfQogICAgcmVuZGVyUGxheXNMaXN0KCk7CiAgICBmbGFzaFNhdmVDb25maXJtYXRpb24obmFtZSk7CiAgICBub3RpZnlQbGF5c0NoYW5nZWQoKTsKICB9IGNhdGNoIChlcnIpIHsKICAgIGNvbnNvbGUuZXJyb3IoJ1NhdmUgZmFpbGVkOicsIGVycik7CiAgICBhbGVydCgnU2F2ZSBmYWlsZWQ6ICcgKyAoZXJyICYmIGVyci5tZXNzYWdlID8gZXJyLm1lc3NhZ2UgOiBlcnIpKTsKICB9Cn0pOwoKLy8gMXgxIHRyYW5zcGFyZW50IFBORyB1c2VkIGlmIHRodW1ibmFpbCByYXN0ZXJpemF0aW9uIGZhaWxzIGZvciBhbnkgcmVhc29uCmNvbnN0IEZBTExCQUNLX1RIVU1CID0gJ2RhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQUVBQUFBQkNBUUFBQUMxSEF3Q0FBQUFDMGxFUVZSNDJtTmsrQThBQVFVQkFTY1k0MllBQUFBQVNVVk9SSzVDWUlJPSc7CgpmdW5jdGlvbiBmbGFzaFNhdmVDb25maXJtYXRpb24obmFtZSkgewogIGNvbnN0IGJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlLWJ0bicpOwogIGNvbnN0IG9yaWdpbmFsID0gYnRuLmlubmVySFRNTDsKICBidG4uaW5uZXJIVE1MID0gJzxzdmcgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSIyMCA2IDkgMTcgNCAxMiIvPjwvc3ZnPiBTYXZlZCc7CiAgYnRuLmRpc2FibGVkID0gdHJ1ZTsKICBzZXRUaW1lb3V0KCgpID0+IHsgYnRuLmlubmVySFRNTCA9IG9yaWdpbmFsOyBidG4uZGlzYWJsZWQgPSBmYWxzZTsgfSwgMTEwMCk7Cn0KCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBFWFBPUlQgKFBORyAvIEpQRUcpIOKAlCByYXN0ZXJpemUgZmllbGQgKyBkaXNjcyArIGFycm93cyB0byBjYW52YXMKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBOYXRpdmUgY2FudmFzIHJlbmRlcmluZyBvZiB0aGUgZmllbGQgYmFja2dyb3VuZCDigJQgbWlycm9ycyB0aGUgU1ZHCi8vIG1hcmtpbmdzIGV4YWN0bHksIHVzZWQgZm9yIGV4cG9ydC90aHVtYm5haWwgcmFzdGVyaXphdGlvbiBzbyB3ZSBuZXZlcgovLyBkZXBlbmQgb24gU1ZHLXRvLWltYWdlIGNvbnZlcnNpb24gKHdoaWNoIGZhaWxzIGluY29uc2lzdGVudGx5IGFjcm9zcwovLyBicm93c2VycyB3aGVuIGxvYWRlZCBmcm9tIGEgQmxvYiBVUkwpLgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0KZnVuY3Rpb24gZHJhd0ZpZWxkQmFja2dyb3VuZChjdHgsIHNjYWxlKSB7CiAgY29uc3QgVyA9IFZCICogc2NhbGUsIEggPSBWQiAqIHNjYWxlOwogIGNvbnN0IHMgPSAodikgPT4gdiAqIHNjYWxlOwoKICAvLyBncmFzcyBzdHJpcGVzIChhbHRlcm5hdGluZyBiYW5kcyBldmVyeSA0MCB2aWV3Qm94IHVuaXRzKQogIGZvciAobGV0IHkgPSAwOyB5IDwgVkI7IHkgKz0gNDApIHsKICAgIGNvbnN0IGJhbmRJbmRleCA9IE1hdGguZmxvb3IoeSAvIDQwKTsKICAgIGN0eC5maWxsU3R5bGUgPSAoYmFuZEluZGV4ICUgMiA9PT0gMCkgPyAnIzNhOTQ0OCcgOiAnIzJlN2MzOCc7CiAgICBjdHguZmlsbFJlY3QoMCwgcyh5KSwgVywgcyg0MCkpOwogIH0KCiAgLy8gaW4tZ29hbCBkYXJrZXIgem9uZSAoeSA0ODAtNTYwKQogIGZvciAobGV0IHkgPSA0ODA7IHkgPCA1NjA7IHkgKz0gNDApIHsKICAgIGNvbnN0IGJhbmRJbmRleCA9IE1hdGguZmxvb3IoeSAvIDQwKTsKICAgIGN0eC5maWxsU3R5bGUgPSAoYmFuZEluZGV4ICUgMiA9PT0gMCkgPyAncmdiYSg0MCwxMDIsNTgsMC44OCknIDogJ3JnYmEoMzQsOTYsNDgsMC44OCknOwogICAgY3R4LmZpbGxSZWN0KDAsIHMoeSksIFcsIHMoNDApKTsKICB9CgogIGN0eC5zdHJva2VTdHlsZSA9ICcjZmZmZmZmJzsKICBjdHgubGluZUNhcCA9ICdidXR0JzsKCiAgLy8gb3V0ZXIgYm91bmRhcnkKICBjdHgubGluZVdpZHRoID0gcygyLjUpOwogIGN0eC5zdHJva2VSZWN0KHMoMjApLCBzKDApLCBzKDUyMCksIHMoNTYwKSk7CgogIC8vIDUwbSBsaW5lICh0b3AgZWRnZSwgdGhpY2tlcikKICBjdHgubGluZVdpZHRoID0gcygzKTsKICBsaW5lKGN0eCwgcygyMCksIHMoMCksIHMoNTQwKSwgcygwKSk7CgogIC8vIGRhc2hlZCB5YXJkIGxpbmVzOiA0MCwzMCwyMCwxMAogIGN0eC5saW5lV2lkdGggPSBzKDEuNSk7CiAgY3R4LnNldExpbmVEYXNoKFtzKDE0KSwgcyg5KV0pOwogIFsxMDAsIDIwMCwgMzAwLCA0MDBdLmZvckVhY2goeSA9PiBsaW5lKGN0eCwgcygyMCksIHMoeSksIHMoNTQwKSwgcyh5KSkpOwogIGN0eC5zZXRMaW5lRGFzaChbXSk7CgogIC8vIHRyeSBsaW5lCiAgY3R4LmxpbmVXaWR0aCA9IHMoMyk7CiAgbGluZShjdHgsIHMoMjApLCBzKDQ4MCksIHMoNTQwKSwgcyg0ODApKTsKCiAgLy8gZGVhZCBiYWxsIGxpbmUKICBjdHgubGluZVdpZHRoID0gcygyKTsKICBsaW5lKGN0eCwgcygyMCksIHMoNTU2KSwgcyg1NDApLCBzKDU1NikpOwoKICAvLyBoYXNoIG1hcmtzIG9uIHRyeSBsaW5lCiAgY3R4LmxpbmVXaWR0aCA9IHMoMik7CiAgbGluZShjdHgsIHMoMTAwKSwgcyg0NzQpLCBzKDEwMCksIHMoNDg2KSk7CiAgbGluZShjdHgsIHMoNDYwKSwgcyg0NzQpLCBzKDQ2MCksIHMoNDg2KSk7CgogIC8vIHRvdWNobGluZSB0aWNrcwogIGN0eC5saW5lV2lkdGggPSBzKDEuNSk7CiAgWzEwMCwgMjAwLCAzMDAsIDQwMF0uZm9yRWFjaCh5ID0+IHsKICAgIGxpbmUoY3R4LCBzKDE0KSwgcyh5KSwgcygyNiksIHMoeSkpOwogICAgbGluZShjdHgsIHMoNTM0KSwgcyh5KSwgcyg1NDYpLCBzKHkpKTsKICB9KTsKCiAgLy8gZ29hbHBvc3RzIChib3R0b20sIGF0IHRoZSB0cnkgbGluZSAvIGluLWdvYWwpCiAgY3R4LmxpbmVXaWR0aCA9IHMoMyk7CiAgbGluZShjdHgsIHMoMjUyKSwgcyg1NTYpLCBzKDI1MiksIHMoNTA2KSk7CiAgbGluZShjdHgsIHMoMzA4KSwgcyg1NTYpLCBzKDMwOCksIHMoNTA2KSk7CiAgbGluZShjdHgsIHMoMjUyKSwgcyg1MjYpLCBzKDMwOCksIHMoNTI2KSk7CiAgY3R4LmxpbmVXaWR0aCA9IHMoNCk7CiAgbGluZShjdHgsIHMoMjgwKSwgcyg1MDYpLCBzKDI4MCksIHMoNDgwKSk7CiAgY3R4LmZpbGxTdHlsZSA9ICcjY2MyMjIyJzsKICByb3VuZFJlY3QoY3R4LCBzKDI0NyksIHMoNTUzKSwgcygxMCksIHMoNiksIHMoMikpOwogIHJvdW5kUmVjdChjdHgsIHMoMzAzKSwgcyg1NTMpLCBzKDEwKSwgcyg2KSwgcygyKSk7CgogIC8vIHlhcmRhZ2UgbGFiZWxzCiAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNDIpJzsKICBjdHguZm9udCA9IGA3MDAgJHtzKDEzKX1weCBzeXN0ZW0tdWksIHNhbnMtc2VyaWZgOwogIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJzsKICBjb25zdCBsYWJlbHMgPSBbWzgsICc1MG0nXSwgWzExNCwgJzQwbSddLCBbMjE0LCAnMzBtJ10sIFszMTQsICcyMG0nXSwgWzQxNCwgJzEwbSddXTsKICBsYWJlbHMuZm9yRWFjaCgoW3ksIHRleHRdKSA9PiB7CiAgICBjdHguZmlsbFRleHQodGV4dCwgcyg0NCksIHMoeSkpOwogICAgY3R4LmZpbGxUZXh0KHRleHQsIHMoNTE2KSwgcyh5KSk7CiAgfSk7CgogIC8vIHpvbmUgbGFiZWwKICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSc7CiAgY3R4LmZvbnQgPSBgNzAwICR7cygxMSl9cHggc3lzdGVtLXVpLCBzYW5zLXNlcmlmYDsKICBjdHguZmlsbFRleHQoJ0kgTiAtIEcgTyBBIEwnLCBzKDI4MCksIHMoNTI0KSk7CgogIC8vIHRyeSBsaW5lIGxhYmVsCiAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMzUpJzsKICBjdHguZm9udCA9IGA3MDAgJHtzKDEwKX1weCBzeXN0ZW0tdWksIHNhbnMtc2VyaWZgOwogIGN0eC5maWxsVGV4dCgnVCBSIFkgICBMIEkgTiBFJywgcygyODApLCBzKDQ3NikpOwoKICAvLyBzdWJ0bGUgdmlnbmV0dGUKICBjb25zdCB2aWcgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoVyAvIDIsIEggLyAyLCBNYXRoLm1pbihXLCBIKSAqIDAuNTUsIFcgLyAyLCBIIC8gMiwgTWF0aC5taW4oVywgSCkgKiAwLjc1KTsKICB2aWcuYWRkQ29sb3JTdG9wKDAsICdyZ2JhKDAsMCwwLDApJyk7CiAgdmlnLmFkZENvbG9yU3RvcCgxLCAncmdiYSgwLDAsMCwwLjM4KScpOwogIGN0eC5maWxsU3R5bGUgPSB2aWc7CiAgY3R4LmZpbGxSZWN0KDAsIDAsIFcsIEgpOwp9CgpmdW5jdGlvbiBsaW5lKGN0eCwgeDEsIHkxLCB4MiwgeTIpIHsKICBjdHguYmVnaW5QYXRoKCk7CiAgY3R4Lm1vdmVUbyh4MSwgeTEpOwogIGN0eC5saW5lVG8oeDIsIHkyKTsKICBjdHguc3Ryb2tlKCk7Cn0KZnVuY3Rpb24gcm91bmRSZWN0KGN0eCwgeCwgeSwgdywgaCwgcikgewogIGN0eC5iZWdpblBhdGgoKTsKICBjdHgubW92ZVRvKHggKyByLCB5KTsKICBjdHguYXJjVG8oeCArIHcsIHksIHggKyB3LCB5ICsgaCwgcik7CiAgY3R4LmFyY1RvKHggKyB3LCB5ICsgaCwgeCwgeSArIGgsIHIpOwogIGN0eC5hcmNUbyh4LCB5ICsgaCwgeCwgeSwgcik7CiAgY3R4LmFyY1RvKHgsIHksIHggKyB3LCB5LCByKTsKICBjdHguY2xvc2VQYXRoKCk7CiAgY3R4LmZpbGwoKTsKfQoKYXN5bmMgZnVuY3Rpb24gcmFzdGVyaXplRmllbGQob3V0VyA9IDEyMDAsIG91dEggPSAxMjAwLCBmb3JtYXQgPSAncG5nJykgewogIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpOwogIGNhbnZhcy53aWR0aCA9IG91dFc7CiAgY2FudmFzLmhlaWdodCA9IG91dEg7CiAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7CiAgY29uc3Qgc2NhbGUgPSBvdXRXIC8gVkI7CgogIC8vIDEuIGRyYXcgYmFzZSBmaWVsZCBkaXJlY3RseSB3aXRoIGNhbnZhcyBwcmltaXRpdmVzIChtaXJyb3JzIHRoZSBTVkcKICAvLyBtYXJraW5ncyAxOjEpLiBEcmF3aW5nIG5hdGl2ZWx5IGF2b2lkcyB0aGUgY3Jvc3MtYnJvd3NlciBmYWlsdXJlcyB0aGF0CiAgLy8gY29tZSB3aXRoIHJhc3Rlcml6aW5nIGFuIDxzdmc+IHZpYSBCbG9iIFVSTCArIDxpbWc+ICsgZHJhd0ltYWdlLgogIGRyYXdGaWVsZEJhY2tncm91bmQoY3R4LCBzY2FsZSk7CgogIC8vIDIuIGRyYXcgYXJyb3dzCiAgY3R4LmxpbmVDYXAgPSAncm91bmQnOwogIGFycm93cy5mb3JFYWNoKGFycm93ID0+IHsKICAgIGN0eC5iZWdpblBhdGgoKTsKICAgIGN0eC5zdHJva2VTdHlsZSA9IGFycm93LmN1cnZlZCA/ICcjNWNjOGU4JyA6ICcjZmZmZmZmJzsKICAgIGN0eC5saW5lV2lkdGggPSAzICogc2NhbGU7CiAgICBpZiAoYXJyb3cuY3VydmVkKSB7CiAgICAgIGN0eC5tb3ZlVG8oYXJyb3cueDEgKiBzY2FsZSwgYXJyb3cueTEgKiBzY2FsZSk7CiAgICAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKGFycm93LmN0cmxYICogc2NhbGUsIGFycm93LmN0cmxZICogc2NhbGUsIGFycm93LngyICogc2NhbGUsIGFycm93LnkyICogc2NhbGUpOwogICAgfSBlbHNlIHsKICAgICAgY3R4Lm1vdmVUbyhhcnJvdy54MSAqIHNjYWxlLCBhcnJvdy55MSAqIHNjYWxlKTsKICAgICAgY3R4LmxpbmVUbyhhcnJvdy54MiAqIHNjYWxlLCBhcnJvdy55MiAqIHNjYWxlKTsKICAgIH0KICAgIGN0eC5zdHJva2UoKTsKCiAgICAvLyBhcnJvd2hlYWQKICAgIGxldCBhbmdsZTsKICAgIGlmIChhcnJvdy5jdXJ2ZWQpIHsKICAgICAgYW5nbGUgPSBNYXRoLmF0YW4yKGFycm93LnkyIC0gYXJyb3cuY3RybFksIGFycm93LngyIC0gYXJyb3cuY3RybFgpOwogICAgfSBlbHNlIHsKICAgICAgYW5nbGUgPSBNYXRoLmF0YW4yKGFycm93LnkyIC0gYXJyb3cueTEsIGFycm93LngyIC0gYXJyb3cueDEpOwogICAgfQogICAgY29uc3QgaGVhZExlbiA9IDEyICogc2NhbGU7CiAgICBjb25zdCBleCA9IGFycm93LngyICogc2NhbGUsIGV5ID0gYXJyb3cueTIgKiBzY2FsZTsKICAgIGN0eC5iZWdpblBhdGgoKTsKICAgIGN0eC5tb3ZlVG8oZXgsIGV5KTsKICAgIGN0eC5saW5lVG8oZXggLSBoZWFkTGVuICogTWF0aC5jb3MoYW5nbGUgLSBNYXRoLlBJIC8gNiksIGV5IC0gaGVhZExlbiAqIE1hdGguc2luKGFuZ2xlIC0gTWF0aC5QSSAvIDYpKTsKICAgIGN0eC5saW5lVG8oZXggLSBoZWFkTGVuICogTWF0aC5jb3MoYW5nbGUgKyBNYXRoLlBJIC8gNiksIGV5IC0gaGVhZExlbiAqIE1hdGguc2luKGFuZ2xlICsgTWF0aC5QSSAvIDYpKTsKICAgIGN0eC5jbG9zZVBhdGgoKTsKICAgIGN0eC5maWxsU3R5bGUgPSBhcnJvdy5jdXJ2ZWQgPyAnIzVjYzhlOCcgOiAnI2ZmZmZmZic7CiAgICBjdHguZmlsbCgpOwogIH0pOwoKICAvLyAzLiBkcmF3IGRpc2NzIGFuZCBYIG1hcmtlcnMKICBjb25zdCBzaXplTXVsdGlwbGllciA9IERJU0NfU0laRV9NVUxUSVBMSUVSU1tkaXNjU2l6ZU1vZGVdIHx8IDE7CiAgZGlzY3MuZm9yRWFjaChkaXNjID0+IHsKICAgIGNvbnN0IGN4ID0gZGlzYy54ICogc2NhbGUsIGN5ID0gZGlzYy55ICogc2NhbGU7CiAgICBjb25zdCByID0gMTggKiBzY2FsZSAqIHNpemVNdWx0aXBsaWVyOwoKICAgIGlmIChkaXNjLmtpbmQgPT09ICd4JykgewogICAgICBjb25zdCBoYWxmID0gciAqIDAuNjI7CiAgICAgIGN0eC5saW5lV2lkdGggPSA1ICogc2NhbGUgKiBzaXplTXVsdGlwbGllcjsKICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJyNlODY0NWMnOwogICAgICBjdHgubGluZUNhcCA9ICdyb3VuZCc7CiAgICAgIGN0eC5iZWdpblBhdGgoKTsKICAgICAgY3R4Lm1vdmVUbyhjeCAtIGhhbGYsIGN5IC0gaGFsZik7CiAgICAgIGN0eC5saW5lVG8oY3ggKyBoYWxmLCBjeSArIGhhbGYpOwogICAgICBjdHgubW92ZVRvKGN4ICsgaGFsZiwgY3kgLSBoYWxmKTsKICAgICAgY3R4LmxpbmVUbyhjeCAtIGhhbGYsIGN5ICsgaGFsZik7CiAgICAgIGN0eC5zdHJva2UoKTsKICAgICAgcmV0dXJuOwogICAgfQoKICAgIGNvbnN0IGdyYWQgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoY3ggLSByICogMC4zLCBjeSAtIHIgKiAwLjM1LCByICogMC4xLCBjeCwgY3ksIHIpOwogICAgZ3JhZC5hZGRDb2xvclN0b3AoMCwgJyNmZmZmZmYnKTsKICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuNTUsICcjZjFlZGUwJyk7CiAgICBncmFkLmFkZENvbG9yU3RvcCgxLCAnI2Q4Y2ZhOCcpOwogICAgY3R4LmJlZ2luUGF0aCgpOwogICAgY3R4LmFyYyhjeCwgY3ksIHIsIDAsIE1hdGguUEkgKiAyKTsKICAgIGN0eC5maWxsU3R5bGUgPSBncmFkOwogICAgY3R4LmZpbGwoKTsKICAgIGN0eC5saW5lV2lkdGggPSAyLjUgKiBzY2FsZTsKICAgIGN0eC5zdHJva2VTdHlsZSA9ICcjZmZmZmZmJzsKICAgIGN0eC5zdHJva2UoKTsKCiAgICBjdHguZmlsbFN0eWxlID0gJyMxYTFhMWEnOwogICAgY3R4LmZvbnQgPSBgODAwICR7MTUgKiBzY2FsZSAqIHNpemVNdWx0aXBsaWVyfXB4IC1hcHBsZS1zeXN0ZW0sIFNlZ29lIFVJLCBzYW5zLXNlcmlmYDsKICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJzsKICAgIGN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJzsKICAgIGN0eC5maWxsVGV4dChkaXNjLm51bWJlciwgY3gsIGN5ICsgMSAqIHNjYWxlKTsKICB9KTsKCiAgaWYgKGZvcm1hdCA9PT0gJ2pwZWcnKSB7CiAgICAvLyBmbGF0dGVuIHRyYW5zcGFyZW5jeSB0byBhIGRhcmsgYmFja2dyb3VuZCBmb3IganBlZyAobm8gYWxwaGEgY2hhbm5lbCkKICAgIGNvbnN0IGZsYXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTsKICAgIGZsYXQud2lkdGggPSBvdXRXOyBmbGF0LmhlaWdodCA9IG91dEg7CiAgICBjb25zdCBmY3R4ID0gZmxhdC5nZXRDb250ZXh0KCcyZCcpOwogICAgZmN0eC5maWxsU3R5bGUgPSAnIzBhMTIxMCc7CiAgICBmY3R4LmZpbGxSZWN0KDAsIDAsIG91dFcsIG91dEgpOwogICAgZmN0eC5kcmF3SW1hZ2UoY2FudmFzLCAwLCAwKTsKICAgIHJldHVybiBmbGF0LnRvRGF0YVVSTCgnaW1hZ2UvanBlZycsIDAuOTIpOwogIH0KICByZXR1cm4gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7Cn0KCi8vIEV4cG9ydCBtb2RhbCB3aXJpbmcKY29uc3QgZXhwb3J0TW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXhwb3J0LW1vZGFsJyk7CmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHBvcnQtYnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7CiAgZXhwb3J0TW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpOwp9KTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4cG9ydC1jYW5jZWwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsKICBleHBvcnRNb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7Cn0pOwpleHBvcnRNb2RhbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7CiAgaWYgKGUudGFyZ2V0ID09PSBleHBvcnRNb2RhbCkgZXhwb3J0TW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpOwp9KTsKCmFzeW5jIGZ1bmN0aW9uIGRvRXhwb3J0KGZvcm1hdCkgewogIGNvbnN0IGRhdGFVcmwgPSBhd2FpdCByYXN0ZXJpemVGaWVsZCgxMjAwLCAxMjAwLCBmb3JtYXQpOwogIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7CiAgY29uc3QgbmFtZSA9IChwbGF5TmFtZUlucHV0LnZhbHVlLnRyaW0oKSB8fCAncGxheScpLnJlcGxhY2UoL1teYS16MC05XC1fXSsvZ2ksICdfJyk7CiAgYS5ocmVmID0gZGF0YVVybDsKICBhLmRvd25sb2FkID0gYCR7bmFtZX0uJHtmb3JtYXQgPT09ICdqcGVnJyA/ICdqcGcnIDogJ3BuZyd9YDsKICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpOwogIGEuY2xpY2soKTsKICBhLnJlbW92ZSgpOwogIGV4cG9ydE1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTsKfQpkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXhwb3J0LXBuZycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gZG9FeHBvcnQoJ3BuZycpKTsKZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4cG9ydC1qcGVnJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBkb0V4cG9ydCgnanBlZycpKTsKCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQovLyBJTklUCi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQpidWlsZFRyYXkoKTsKYXBwbHlEaXNjU2l6ZU1vZGUoKTsKcmVuZGVyRGlzY3MoKTsKcmVuZGVyQXJyb3dzKCk7CnJlbmRlclBsYXlzTGlzdCgpOwoKCn0pKCk7";

function decodeB64Utf8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function PlaysView({ team, plays, onChange, showToast }) {
  const containerRef = useRef(null);
  const styleElRef = useRef(null);
  const scriptElRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Inject scoped styles once per mount.
    const styleEl = document.createElement("style");
    styleEl.textContent = decodeB64Utf8(PLAY_CREATOR_CSS_B64);
    document.head.appendChild(styleEl);
    styleElRef.current = styleEl;

    // Set up the bridge: initial data in, change notifications out.
    window.__playCreatorInitialPlays = plays;
    window.__playCreatorOnPlaysChanged = (nextPlays) => {
      onChange(nextPlays);
    };

    // Mount the widget markup.
    container.innerHTML = decodeB64Utf8(PLAY_CREATOR_HTML_B64);

    // Execute the widget's script. Must be a real <script> element —
    // setting innerHTML alone does not execute embedded scripts.
    const scriptEl = document.createElement("script");
    scriptEl.textContent = decodeB64Utf8(PLAY_CREATOR_JS_B64);
    document.body.appendChild(scriptEl);
    scriptElRef.current = scriptEl;

    return () => {
      // Full teardown so switching squads or leaving the tab never leaks
      // listeners, globals, or styles into the rest of the app.
      if (styleElRef.current) {
        document.head.removeChild(styleElRef.current);
        styleElRef.current = null;
      }
      if (scriptElRef.current) {
        document.body.removeChild(scriptElRef.current);
        scriptElRef.current = null;
      }
      delete window.__playCreatorInitialPlays;
      delete window.__playCreatorOnPlaysChanged;
      if (container) container.innerHTML = "";
    };
    // Re-mount fresh whenever the active squad changes, so the widget
    // always loads that squad's own plays rather than carrying over state.
  }, [team.id]);

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Plays</h1>
          <div style={S.pageSub}>{team.name} · draw, save, and reuse set plays for this squad</div>
        </div>
      </div>
      <div style={S.playCreatorFrame}>
        <div ref={containerRef} style={S.playCreatorMount} />
      </div>
    </div>
  );
}

function FocusView({ team, board, onChange, showToast }) {
  const focusAreas = board.focusAreas || [];
  const notes = board.notes || [];
  const [newFocusLabel, setNewFocusLabel] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(() => toLocalDateKey(new Date()));
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteDate, setEditingNoteDate] = useState("");

  const update = (patch) => onChange({ ...board, ...patch });

  const addFocusArea = () => {
    if (!newFocusLabel.trim()) return;
    const area = { id: uid(), label: newFocusLabel.trim(), status: "active", created: Date.now() };
    update({ focusAreas: [...focusAreas, area] });
    setNewFocusLabel("");
    showToast("Focus area added");
  };

  const toggleFocusStatus = (id) => {
    update({
      focusAreas: focusAreas.map(f => f.id === id ? { ...f, status: f.status === "done" ? "active" : "done" } : f),
    });
  };

  const removeFocusArea = (id) => {
    update({ focusAreas: focusAreas.filter(f => f.id !== id) });
    showToast("Focus area removed");
  };

  const addNote = () => {
    if (!newNoteText.trim()) return;
    const note = { id: uid(), date: newNoteDate, text: newNoteText.trim(), created: Date.now() };
    update({ notes: [note, ...notes] });
    setNewNoteText("");
    showToast("Note added");
  };

  const startEditNote = (n) => {
    setEditingNoteId(n.id);
    setEditingNoteText(n.text);
    setEditingNoteDate(n.date || toLocalDateKey(new Date()));
  };

  const saveEditNote = () => {
    update({
      notes: notes.map(n => n.id === editingNoteId ? { ...n, text: editingNoteText, date: editingNoteDate } : n),
    });
    setEditingNoteId(null);
    showToast("Note updated");
  };

  const deleteNote = (id) => {
    update({ notes: notes.filter(n => n.id !== id) });
    showToast("Note deleted");
  };

  const activeAreas = focusAreas.filter(f => f.status !== "done");
  const doneAreas = focusAreas.filter(f => f.status === "done");
  const sortedNotes = [...notes].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0));

  return (
    <div style={S.pageWrap}>
      <div style={S.pageHeadRow}>
        <div>
          <h1 style={S.pageTitle}>Focus & Notes</h1>
          <div style={S.pageSub}>{team.name} · current focus areas and dated coaching notes</div>
        </div>
      </div>

      <div style={S.focusSection}>
        <h2 style={S.sectionHead}>Focus areas</h2>
        <div style={S.focusAddRow}>
          <input
            style={S.inputSm}
            placeholder="e.g. Defensive line speed, Kick chase, Wrestle technique…"
            value={newFocusLabel}
            onChange={e => setNewFocusLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addFocusArea(); }}
          />
          <button style={S.btnPrimarySm} onClick={addFocusArea} disabled={!newFocusLabel.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>

        {activeAreas.length === 0 && doneAreas.length === 0 ? (
          <div style={S.summaryEmptyNote}>No focus areas yet — add what the squad is working on right now.</div>
        ) : (
          <div style={S.focusChipWrap}>
            {activeAreas.map(f => (
              <span key={f.id} style={S.focusChipActive}>
                <button style={S.focusChipToggle} onClick={() => toggleFocusStatus(f.id)} title="Mark as done">
                  <div style={S.weekSessionToggleOff} />
                </button>
                {f.label}
                <button style={S.focusChipRemove} onClick={() => removeFocusArea(f.id)} aria-label="Remove"><X size={11} /></button>
              </span>
            ))}
            {doneAreas.map(f => (
              <span key={f.id} style={S.focusChipDone}>
                <button style={S.focusChipToggle} onClick={() => toggleFocusStatus(f.id)} title="Mark as active again">
                  <CheckCircle2 size={14} color="var(--turf)" />
                </button>
                {f.label}
                <button style={S.focusChipRemove} onClick={() => removeFocusArea(f.id)} aria-label="Remove"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={S.focusSection}>
        <h2 style={S.sectionHead}>Coaching notes</h2>
        <div style={S.focusNoteAddBox}>
          <FieldSm label="Date">
            <input type="date" style={S.selectSm} value={newNoteDate} onChange={e => setNewNoteDate(e.target.value)} />
          </FieldSm>
          <textarea
            style={S.focusNoteTextarea}
            rows={2}
            placeholder="What did you notice this session? Player progress, areas to revisit, anything worth remembering…"
            value={newNoteText}
            onChange={e => setNewNoteText(e.target.value)}
          />
          <button style={S.btnPrimarySm} onClick={addNote} disabled={!newNoteText.trim()}>
            <Plus size={14} /> Add note
          </button>
        </div>

        {sortedNotes.length === 0 ? (
          <div style={S.summaryEmptyNote}>No notes logged yet.</div>
        ) : (
          <div style={S.focusNoteList}>
            {sortedNotes.map(n => (
              <div key={n.id} style={S.focusNoteRow}>
                {editingNoteId === n.id ? (
                  <div style={S.focusNoteEditBox}>
                    <input type="date" style={S.selectSm} value={editingNoteDate} onChange={e => setEditingNoteDate(e.target.value)} />
                    <textarea style={S.focusNoteTextarea} rows={2} value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} autoFocus />
                    <div style={S.modalActions}>
                      <button style={S.btnGhost} onClick={() => setEditingNoteId(null)}>Cancel</button>
                      <button style={S.btnPrimary} onClick={saveEditNote}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={S.focusNoteDate}>{n.date ? new Date(n.date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "No date"}</div>
                    <div style={S.focusNoteText}>{n.text}</div>
                    <div style={S.focusNoteActions}>
                      <button style={S.iconBtnGhost} onClick={() => startEditNote(n)} aria-label="Edit"><Edit3 size={12} /></button>
                      <button style={S.iconBtnGhost} onClick={() => deleteNote(n.id)} aria-label="Delete"><Trash2 size={12} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerEditModal({ player, onSave, onClose }) {
  const [form, setForm] = useState(player || { id: uid(), name: "", position: "PROP", availability: "FULL" });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>{player ? "Edit player" : "Add player"}</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <label style={S.fieldLabel}>Name</label>
        <input style={S.input} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Surname, First name" autoFocus />
        <label style={S.fieldLabel}>Position</label>
        <div style={S.modalChipRow}>
          {POSITIONS.map(p => <Chip key={p} active={form.position === p} onClick={() => update("position", p)}>{p}</Chip>)}
        </div>
        <label style={S.fieldLabel}>Availability</label>
        <div style={S.modalChipRow}>
          {AVAILABILITY.map(a => <Chip key={a.v} active={form.availability === a.v} onClick={() => update("availability", a.v)} color={a.color}>{a.label}</Chip>)}
        </div>
        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} disabled={!form.name.trim()} onClick={() => onSave(form)}>Save player</button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ existingNames, onImport, onClose }) {
  const [raw, setRaw] = useState("");
  const [defaultPosition, setDefaultPosition] = useState("");
  const [defaultAvailability, setDefaultAvailability] = useState("FULL");
  const [rowOverrides, setRowOverrides] = useState({});

  const existingSet = useMemo(() => new Set((existingNames || []).map(n => (n || "").toLowerCase())), [existingNames]);
  const parsed = useMemo(() => parsePastedRoster(raw), [raw]);
  const rows = useMemo(() => parsed.map((p, i) => ({
    ...p,
    position: rowOverrides[i]?.position ?? p.position ?? defaultPosition,
    duplicate: existingSet.has(p.name.toLowerCase()),
  })), [parsed, rowOverrides, defaultPosition, existingSet]);

  const newCount = rows.filter(r => !r.duplicate).length;
  const dupCount = rows.length - newCount;

  const setRowPosition = (i, pos) => setRowOverrides(o => ({ ...o, [i]: { ...o[i], position: pos } }));

  const handleImport = () => {
    const players = rows
      .filter(r => !r.duplicate)
      .map(r => ({ id: uid(), name: r.name, position: r.position || defaultPosition || "", availability: defaultAvailability }));
    if (players.length === 0) return;
    onImport(players);
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>Bulk import players</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <label style={S.fieldLabel}>Paste your squad list — one player per line</label>
        <textarea
          style={S.bulkTextarea}
          rows={7}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={"Smith, Jake\nWilliams, Tom, HK\nO'Brien, Mark - PROP\nJones, Connor"}
          autoFocus
        />
        <div style={S.bulkHint}>
          Works with plain names, or a position after a comma or dash (e.g. "Smith, Jake, HK"). Pasting straight from a spreadsheet column also works.
        </div>

        <div style={S.bulkDefaultsRow}>
          <FieldSm label="Default position (if not specified)">
            <select style={S.selectSm} value={defaultPosition} onChange={e => setDefaultPosition(e.target.value)}>
              <option value="">—</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FieldSm>
          <FieldSm label="Set availability for all">
            <select style={S.selectSm} value={defaultAvailability} onChange={e => setDefaultAvailability(e.target.value)}>
              {AVAILABILITY.map(a => <option key={a.v} value={a.v}>{a.label}</option>)}
            </select>
          </FieldSm>
        </div>

        {rows.length > 0 && (
          <>
            <div style={S.bulkPreviewHead}>
              <span>{rows.length} player{rows.length === 1 ? "" : "s"} found</span>
              {dupCount > 0 && <span style={S.bulkDupNote}>{dupCount} already in squad — will be skipped</span>}
            </div>
            <div style={S.bulkPreviewList}>
              {rows.map((r, i) => (
                <div key={i} style={{ ...S.bulkPreviewRow, opacity: r.duplicate ? 0.45 : 1 }}>
                  <span style={S.bulkPreviewName}>{r.name}</span>
                  <select
                    style={S.bulkPreviewPosSelect}
                    value={r.position || ""}
                    onChange={e => setRowPosition(i, e.target.value)}
                    disabled={r.duplicate}
                  >
                    <option value="">No position</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {r.duplicate && <span style={S.bulkDupTag}>Already added</span>}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={S.modalActions}>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} disabled={newCount === 0} onClick={handleImport}>
            Add {newCount} player{newCount === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   BUILDER VIEW (the core session timeline)
----------------------------------------------------------------*/

function emptyBlock(category = "SKILL") {
  return {
    id: uid(),
    category,
    drillName: "",
    drillTime: 5,
    intensity: 2,
    contact: 0,
    group: "",
    focus: "",
    lookFor: "",
    coaches: "",
    videoUrl: "",
    useTeams: false,
    teamSplit: null,
    playId: null,
  };
}

function BuilderView({ team, sessionId, drills, squad, plays, defaultProgram, programs, onDrillsChange, onSaved, onSaveAsTemplate, onBack, showToast }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showDrillPicker, setShowDrillPicker] = useState(null); // block id or null
  const [savingPdf, setSavingPdf] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (sessionId) {
        const s = await Store.getSession(team.id, sessionId);
        if (s) {
          s.blocks = s.blocks.map(b => {
            if (b.isBreak) return b;
            if (b.lookFor && b.lookFor.trim()) {
              const combined = [b.focus, b.lookFor].filter(Boolean).join(b.focus ? " — " : "");
              return { ...b, focus: combined, lookFor: "" };
            }
            return b;
          });
        }
        setSession(s || freshSession());
      } else {
        setSession(freshSession());
      }
      setLoadingSession(false);
    })();
  }, [sessionId, team.id]);

  function freshSession() {
    return {
      id: uid(),
      name: "",
      day: "",
      date: "",
      weekCode: "",
      program: defaultProgram || "PRE_SEASON",
      theme: "",
      content: "",
      sessionSize: "Medium",
      targetMins: "",
      blocks: [emptyBlock("WARM_UP")],
      created: Date.now(),
      updated: Date.now(),
    };
  }

  const update = (patch) => setSession(s => ({ ...s, ...patch, updated: Date.now() }));

  const updateBlock = (id, patch) => {
    setSession(s => ({
      ...s,
      blocks: s.blocks.map(b => b.id === id ? { ...b, ...patch } : b),
      updated: Date.now(),
    }));
  };

  const addBlock = (category, afterId) => {
    const nb = emptyBlock(category);
    setSession(s => {
      const idx = afterId ? s.blocks.findIndex(b => b.id === afterId) : s.blocks.length - 1;
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, nb);
      return { ...s, blocks, updated: Date.now() };
    });
  };

  const addBreak = (afterId) => {
    const nb = { id: uid(), isBreak: true, label: "Drinks break" };
    setSession(s => {
      const idx = afterId ? s.blocks.findIndex(b => b.id === afterId) : s.blocks.length - 1;
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, nb);
      return { ...s, blocks, updated: Date.now() };
    });
  };

  const removeBlock = (id) => {
    setSession(s => ({ ...s, blocks: s.blocks.filter(b => b.id !== id), updated: Date.now() }));
  };

  const moveBlock = (id, dir) => {
    setSession(s => {
      const idx = s.blocks.findIndex(b => b.id === id);
      const target = idx + dir;
      if (target < 0 || target >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
      return { ...s, blocks, updated: Date.now() };
    });
  };

  const applyDrillToBlock = (blockId, drill) => {
    updateBlock(blockId, {
      drillName: drill.name,
      category: drill.type,
      focus: drill.desc || "",
      videoUrl: drill.videoUrl || "",
      contact: drill.contact || 0,
    });
    setShowDrillPicker(null);
  };

  const totalMins = useMemo(() => {
    if (!session) return 0;
    return session.blocks.filter(b => !b.isBreak).reduce((a, b) => a + (Number(b.drillTime) || 0), 0);
  }, [session]);

  const blockCount = session ? session.blocks.filter(b => !b.isBreak).length : 0;

  const handleSave = async () => {
    if (!session.name.trim()) { showToast("Give the session a name first", "err"); return null; }
    const toSave = { ...session, totalMins, blockCount, updated: Date.now() };
    await Store.saveSession(team.id, toSave);
    setSession(toSave);
    const meta = {
      id: toSave.id, name: toSave.name, day: toSave.day, date: toSave.date, theme: toSave.theme,
      totalMins, blockCount, updated: toSave.updated, weekCode: toSave.weekCode, program: toSave.program,
    };
    onSaved(meta);
    return { full: toSave, meta };
  };

  const handleExportPdf = async () => {
    setSavingPdf(true);
    try {
      exportSessionPdf(session, team, totalMins, blockCount, squad);
      showToast("File downloaded — open it, then use Print (Ctrl/Cmd+P) to save as PDF");
    } catch (e) {
      showToast("Export failed", "err");
    }
    setSavingPdf(false);
  };

  const handleShare = async () => {
    if (!session.name.trim()) { showToast("Save the session first", "err"); return; }
    await handleSave();
    showToast(`Saved to ${team.name}'s sessions — any coach on this squad can open and edit it`);
  };

  const handleSaveAsTemplate = async () => {
    if (!session.name.trim()) { showToast("Give the session a name first", "err"); return; }
    setSavingTemplate(true);
    try {
      const result = await handleSave();
      if (result) {
        await onSaveAsTemplate(result.full.id, result.full, result.meta);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loadingSession || !session) {
    return <div style={S.pageWrap}><div style={S.loadingInline}>Loading session…</div></div>;
  }

  return (
    <div style={S.builderWrap}>
      <div style={S.builderTopRow}>
        <button style={S.backBtn} onClick={onBack}><ArrowLeft size={15} /> Sessions</button>
        <div style={S.builderTopActions}>
          <button style={S.btnGhost} onClick={handleExportPdf} disabled={savingPdf}>
            <FileDown size={14} /> {savingPdf ? "Preparing…" : "Export PDF"}
          </button>
          <button style={S.btnGhost} onClick={handleSaveAsTemplate} disabled={savingTemplate} title="Share this session as a reusable template for every squad">
            <Library size={14} /> {savingTemplate ? "Saving…" : "Save as template"}
          </button>
          <button style={S.btnGhost} onClick={handleShare}><Share2 size={14} /> Share</button>
          <button style={S.btnPrimary} onClick={handleSave}><Save size={14} /> Save session</button>
        </div>
      </div>

      <div style={S.builderGrid}>
        {/* LEFT: timeline rail + header form */}
        <div style={S.builderMain}>
          <SessionHeaderForm session={session} update={update} squad={squad} totalMins={totalMins} programs={programs} />

          <div style={S.timelineWrap}>
            <div style={S.timelineRail}>
              <div style={S.timelineRailFill(totalMins)} />
            </div>
            <div style={S.timelineBlocks}>
              {session.blocks.map((b, i) => (
                b.isBreak ? (
                  <BreakRow key={b.id} block={b} onRemove={() => removeBlock(b.id)} onMove={(d) => moveBlock(b.id, d)} />
                ) : (
                  <BlockRow
                    key={b.id}
                    block={b}
                    index={i}
                    squad={squad}
                    plays={plays}
                    onUpdate={(p) => updateBlock(b.id, p)}
                    onRemove={() => removeBlock(b.id)}
                    onMove={(d) => moveBlock(b.id, d)}
                    onPickDrill={() => setShowDrillPicker(b.id)}
                  />
                )
              ))}
              <div style={S.addBlockRow}>
                <button style={S.addBlockBtn} onClick={() => addBlock("SKILL")}><Plus size={14} /> Add drill block</button>
                <button style={S.addBlockBtnGhost} onClick={() => addBreak()}><Coffee size={14} /> Add drinks break</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: live summary */}
        <SessionSummaryPanel session={session} totalMins={totalMins} blockCount={blockCount} onUpdateTarget={(v) => update({ targetMins: v })} />
      </div>

      {showDrillPicker && (
        <DrillPickerModal
          drills={drills}
          onPick={(d) => applyDrillToBlock(showDrillPicker, d)}
          onClose={() => setShowDrillPicker(null)}
          onCreateNew={(name) => {
            const d = { id: uid(), type: "SKILL", subtype: "", name, desc: "" };
            onDrillsChange([...drills, d]);
            applyDrillToBlock(showDrillPicker, d);
          }}
        />
      )}
    </div>
  );
}

function SessionHeaderForm({ session, update, squad, totalMins, programs }) {
  return (
    <div style={S.headerForm}>
      <input
        style={S.sessionNameInput}
        placeholder="Session name, e.g. Tue G-3 Tryline D&A"
        value={session.name}
        onChange={e => update({ name: e.target.value })}
      />
      <div style={S.headerFormRow}>
        <FieldSm label="Program">
          <select style={S.selectSm} value={session.program || (programs[0] && programs[0].key)} onChange={e => update({ program: e.target.value })}>
            {programs.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </FieldSm>
        <FieldSm label="Day">
          <select style={S.selectSm} value={session.day} onChange={e => update({ day: e.target.value })}>
            <option value="">—</option>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FieldSm>
        <FieldSm label="Date">
          <input type="date" style={S.selectSm} value={session.date} onChange={e => update({ date: e.target.value })} />
        </FieldSm>
        <FieldSm label="Week code">
          <input style={S.selectSm} placeholder="C1W4" value={session.weekCode} onChange={e => update({ weekCode: e.target.value })} />
        </FieldSm>
        <FieldSm label="Session size">
          <select style={S.selectSm} value={session.sessionSize} onChange={e => update({ sessionSize: e.target.value })}>
            {SESSION_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FieldSm>
        <div style={S.sessionClock}>
          <Clock size={16} />
          <span style={S.sessionClockVal}>{fmtMin(totalMins)}</span>
        </div>
      </div>
      <div style={S.headerFormRow2}>
        <input style={S.inputSm} placeholder="Theme, e.g. Brilliant @ basics" value={session.theme} onChange={e => update({ theme: e.target.value })} />
        <input style={S.inputSm} placeholder="Content focus, e.g. Tryline D&A / kick chase" value={session.content} onChange={e => update({ content: e.target.value })} />
      </div>
    </div>
  );
}

function FieldSm({ label, children }) {
  return (
    <div style={S.fieldSmWrap}>
      <label style={S.fieldSmLabel}>{label}</label>
      {children}
    </div>
  );
}

function ContactLevelPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = CONTACT_LEVELS.find(c => c.v === value) || CONTACT_LEVELS[0];
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div style={S.contactPickerWrap} ref={ref}>
      <button
        type="button"
        style={{
          ...S.contactPickerBtn,
          color: current.v === 0 ? "var(--text-tertiary)" : current.color,
          borderColor: current.v === 0 ? "var(--border-2)" : current.color + "66",
          background: current.v === 0 ? "transparent" : current.color + "1A",
        }}
        onClick={() => setOpen(v => !v)}
        title={current.label}
      >
        <Shield size={12} />
        {current.short}
      </button>
      {open && (
        <div style={S.contactPickerMenu}>
          {CONTACT_LEVELS.map(c => (
            <button
              key={c.v}
              type="button"
              style={{
                ...S.contactPickerOption,
                color: c.v === 0 ? "var(--text-secondary)" : c.color,
                fontWeight: c.v === value ? 600 : 500,
                background: c.v === value ? (c.v === 0 ? "var(--surface-2)" : c.color + "1A") : "transparent",
              }}
              onClick={() => { onChange(c.v); setOpen(false); }}
            >
              <span style={{ ...S.contactPickerDot, background: c.v === 0 ? "var(--text-tertiary)" : c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TEAM_COLORS = ["#3FA34D", "#2F8FD6", "#C03B2B", "#E8A33D", "#9D5BD2", "#1C9E8E"];

function TeamSplitBuilder({ squad, teamSplit, onChange }) {
  const teamCount = teamSplit?.teamCount || 2;
  const assignments = teamSplit?.assignments || {};
  const names = teamSplit?.names || {};
  const [dragPlayerId, setDragPlayerId] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  const sortedSquad = useMemo(
    () => [...squad].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [squad]
  );

  const setTeamCount = (n) => {
    // Clear assignments that now fall outside the new team count
    const next = {};
    Object.entries(assignments).forEach(([pid, t]) => {
      if (t <= n) next[pid] = t;
    });
    const nextNames = {};
    Object.entries(names).forEach(([num, label]) => {
      if (Number(num) <= n) nextNames[num] = label;
    });
    onChange({ teamCount: n, assignments: next, names: nextNames });
  };

  const assignPlayer = (playerId, teamNum) => {
    const next = { ...assignments };
    if (teamNum === null) {
      delete next[playerId];
    } else {
      next[playerId] = teamNum;
    }
    onChange({ teamCount, assignments: next, names });
  };

  const setTeamName = (teamNum, label) => {
    const nextNames = { ...names, [teamNum]: label };
    onChange({ teamCount, assignments, names: nextNames });
  };

  const autoSplit = () => {
    const ids = sortedSquad.map(p => p.id);
    // Shuffle for a fair random split
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const next = {};
    shuffled.forEach((id, i) => { next[id] = (i % teamCount) + 1; });
    onChange({ teamCount, assignments: next, names });
  };

  const clearAll = () => onChange({ teamCount, assignments: {}, names });

  const unassigned = sortedSquad.filter(p => !assignments[p.id]);
  const teams = Array.from({ length: teamCount }, (_, i) => i + 1).map(num => ({
    num,
    color: TEAM_COLORS[num - 1],
    label: names[num] || `Team ${num}`,
    players: sortedSquad.filter(p => assignments[p.id] === num),
  }));

  const handleDragStart = (playerId) => setDragPlayerId(playerId);
  const handleDragEnd = () => { setDragPlayerId(null); setDragOverZone(null); };
  const handleDrop = (zone) => {
    if (dragPlayerId) assignPlayer(dragPlayerId, zone);
    setDragPlayerId(null);
    setDragOverZone(null);
  };

  if (squad.length === 0) {
    return (
      <div style={S.teamSplitEmpty}>
        No players in this squad's roster yet — add players under Squads → roster to build team splits here.
      </div>
    );
  }

  return (
    <div style={S.teamSplitWrap}>
      <div style={S.teamSplitToolbar}>
        <FieldSm label="Number of teams">
          <select style={S.selectSm} value={teamCount} onChange={e => setTeamCount(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} teams</option>)}
          </select>
        </FieldSm>
        <div style={S.teamSplitToolbarActions}>
          <button style={S.btnGhostXs} onClick={autoSplit}><Shuffle size={12} /> Auto split</button>
          <button style={S.btnGhostXs} onClick={clearAll}><X size={12} /> Clear</button>
        </div>
      </div>

      <div style={S.teamSplitBoard}>
        <div
          style={{ ...S.teamSplitPool, ...(dragOverZone === "pool" ? S.teamSplitZoneOver : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOverZone("pool"); }}
          onDragLeave={() => setDragOverZone(null)}
          onDrop={() => handleDrop(null)}
        >
          <div style={S.teamSplitPoolHead}>Unassigned <span style={S.teamSplitCount}>{unassigned.length}</span></div>
          <div style={S.teamSplitChipList}>
            {unassigned.map(p => (
              <PlayerChip key={p.id} player={p} draggable onDragStart={() => handleDragStart(p.id)} onDragEnd={handleDragEnd} />
            ))}
            {unassigned.length === 0 && <div style={S.teamSplitPoolEmpty}>All players assigned</div>}
          </div>
        </div>

        <div style={S.teamSplitTeamsGrid}>
          {teams.map(t => (
            <div
              key={t.num}
              style={{ ...S.teamSplitTeamCol, borderColor: t.color + "55", ...(dragOverZone === t.num ? S.teamSplitZoneOver : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOverZone(t.num); }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={() => handleDrop(t.num)}
            >
              <div style={S.teamSplitTeamHeadRow}>
                <input
                  className="team-name-input"
                  style={{ ...S.teamNameInput, color: t.color }}
                  value={t.label}
                  onChange={e => setTeamName(t.num, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder={`Team ${t.num}`}
                />
                <span style={S.teamSplitCount}>{t.players.length}</span>
              </div>
              <div style={S.teamSplitChipList}>
                {t.players.map(p => (
                  <PlayerChip key={p.id} player={p} color={t.color} draggable onDragStart={() => handleDragStart(p.id)} onDragEnd={handleDragEnd} />
                ))}
                {t.players.length === 0 && <div style={S.teamSplitPoolEmpty}>Drop players here</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerChip({ player, color, draggable, onDragStart, onDragEnd }) {
  const isMod = player.availability === "MOD";
  const isRehab = player.availability === "REHAB";
  const ringColor = isRehab ? "#C03B2B" : isMod ? "#E8A33D" : null;
  return (
    <div
      style={{
        ...S.playerChip,
        borderColor: color ? color + "66" : "var(--border-2)",
        ...(ringColor ? { boxShadow: `0 0 0 2px ${ringColor}` } : {}),
      }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={isRehab ? "Rehab" : isMod ? "Modified" : undefined}
    >
      <GripVertical size={11} color="var(--text-tertiary)" />
      <span style={S.playerChipName}>{player.name}</span>
      {ringColor && <span style={{ ...S.playerChipAvailDot, background: ringColor }} />}
      {player.position && <span style={S.playerChipPos}>{player.position}</span>}
    </div>
  );
}

function BlockRow({ block, index, squad, plays, onUpdate, onRemove, onMove, onPickDrill }) {
  const cat = CATEGORY_MAP[block.category] || CATEGORY_MAP.SKILL;
  const [expanded, setExpanded] = useState(false);
  const [showPlayPicker, setShowPlayPicker] = useState(false);
  const attachedPlay = block.playId ? (plays || []).find(p => p.id === block.playId) : null;

  return (
    <div style={{ ...S.blockRow, borderLeftColor: cat.color }}>
      <div style={S.blockRowMain}>
        <div style={S.blockGrip}>
          <button style={S.gripBtn} onClick={() => onMove(-1)} aria-label="Move up"><ChevronUp size={13} /></button>
          <GripVertical size={14} color="var(--text-tertiary)" />
          <button style={S.gripBtn} onClick={() => onMove(1)} aria-label="Move down"><ChevronDown size={13} /></button>
        </div>

        <select
          style={{ ...S.categorySelect, color: cat.color, borderColor: cat.color + "55" }}
          value={block.category}
          onChange={e => onUpdate({ category: e.target.value })}
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <button style={S.drillNameBtn} onClick={onPickDrill}>
          {block.drillName || <span style={S.drillNamePlaceholder}>Choose a drill…</span>}
        </button>

        {block.videoUrl && (
          <a
            href={block.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={S.blockVideoBtn}
            onClick={e => e.stopPropagation()}
            aria-label="Watch reference video"
            title="Watch reference video"
          >
            <PlayCircle size={15} />
          </a>
        )}

        {attachedPlay && (
          <button
            style={S.blockPlayBtn}
            onClick={() => setShowPlayPicker(v => !v)}
            aria-label="View attached play"
            title={`Attached play: ${attachedPlay.name}`}
          >
            <Route size={13} />
          </button>
        )}

        <ContactLevelPicker value={block.contact} onChange={v => onUpdate({ contact: v })} />

        {block.useTeams && (
          <span style={S.teamsActiveBadge} title="Teams set for this drill">
            <Users size={11} /> {block.teamSplit?.teamCount || 2}
          </span>
        )}

        <div style={S.blockTimeWrap}>
          <input
            type="number" min={0} max={90}
            style={S.blockTimeInput}
            value={block.drillTime}
            onChange={e => onUpdate({ drillTime: e.target.value })}
          />
          <span style={S.blockTimeUnit}>min</span>
        </div>

        <button style={S.iconBtnGhost} onClick={() => setExpanded(v => !v)} aria-label="Expand details">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button style={S.iconBtnGhost} onClick={onRemove} aria-label="Remove block"><Trash2 size={13} /></button>
      </div>

      <div style={S.blockNotesRow}>
        <Edit3 size={12} color="var(--text-tertiary)" style={S.blockNotesIcon} />
        <textarea
          style={S.blockNotesInput}
          rows={1}
          value={block.focus || ""}
          onChange={e => onUpdate({ focus: e.target.value })}
          placeholder="Drill notes — coaching points, what to look for…"
        />
      </div>

      {expanded && (
        <div style={S.blockDetails}>
          <div style={S.blockDetailsGrid}>
            <FieldSm label="Group">
              <input style={S.selectSm} placeholder="e.g. Backs, Fwds, All" value={block.group} onChange={e => onUpdate({ group: e.target.value })} />
            </FieldSm>
            <FieldSm label="Intensity">
              <select style={S.selectSm} value={block.intensity} onChange={e => onUpdate({ intensity: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}/5</option>)}
              </select>
            </FieldSm>
            <FieldSm label="Coaches">
              <input style={S.selectSm} placeholder="Initials, e.g. JM/DY" value={block.coaches} onChange={e => onUpdate({ coaches: e.target.value })} />
            </FieldSm>
          </div>
          <FieldSm label="Reference video link">
            <div style={S.videoInputRowSm}>
              <Video size={13} color="var(--text-tertiary)" />
              <input
                style={S.videoInputSm}
                value={block.videoUrl || ""}
                onChange={e => onUpdate({ videoUrl: e.target.value })}
                placeholder="youtube.com/watch?v=… or club drive link"
              />
              {block.videoUrl && (
                <a href={normalizeVideoUrl(block.videoUrl)} target="_blank" rel="noopener noreferrer" style={S.videoOpenLink} onClick={e => e.stopPropagation()}>
                  Open <Link2 size={11} />
                </a>
              )}
            </div>
          </FieldSm>

          <div style={{ marginTop: 10 }}>
            <FieldSm label="Attached play">
              {attachedPlay ? (
                <div style={S.attachedPlayRow}>
                  {attachedPlay.thumb && <img src={attachedPlay.thumb} alt="" style={S.attachedPlayThumb} />}
                  <span style={S.attachedPlayName}>{attachedPlay.name}</span>
                  <button style={S.btnGhostXs} onClick={() => setShowPlayPicker(true)}>Change</button>
                  <button style={S.iconBtnGhost} onClick={() => onUpdate({ playId: null })} aria-label="Remove attached play"><X size={12} /></button>
                </div>
              ) : (
                <button style={S.btnGhostXs} onClick={() => setShowPlayPicker(true)}><Route size={12} /> Attach a saved play</button>
              )}
            </FieldSm>
          </div>

          <button
            style={S.teamsToggleRow}
            onClick={() => onUpdate({ useTeams: !block.useTeams })}
          >
            {block.useTeams ? <ToggleRight size={20} color="var(--turf)" /> : <ToggleLeft size={20} color="var(--text-tertiary)" />}
            <span style={block.useTeams ? S.teamsToggleLabelOn : S.teamsToggleLabel}>Use teams for this drill</span>
          </button>

          {block.useTeams && (
            <TeamSplitBuilder
              squad={squad}
              teamSplit={block.teamSplit}
              onChange={(next) => onUpdate({ teamSplit: next })}
            />
          )}
        </div>
      )}

      {showPlayPicker && (
        <PlayPickerModal
          plays={plays || []}
          onPick={(playId) => { onUpdate({ playId }); setShowPlayPicker(false); }}
          onClose={() => setShowPlayPicker(false)}
        />
      )}

    </div>
  );
}

function BreakRow({ block, onRemove, onMove }) {
  return (
    <div style={S.breakRow}>
      <Coffee size={14} />
      <span style={S.breakLabel}>{block.label}</span>
      <div style={S.breakActions}>
        <button style={S.gripBtn} onClick={() => onMove(-1)} aria-label="Move up"><ChevronUp size={13} /></button>
        <button style={S.gripBtn} onClick={() => onMove(1)} aria-label="Move down"><ChevronDown size={13} /></button>
        <button style={S.iconBtnGhost} onClick={onRemove} aria-label="Remove break"><X size={13} /></button>
      </div>
    </div>
  );
}

function SessionSummaryPanel({ session, totalMins, blockCount, onUpdateTarget }) {
  const byCategory = useMemo(() => {
    const map = {};
    session.blocks.filter(b => !b.isBreak).forEach(b => {
      const k = b.category || "SKILL";
      map[k] = (map[k] || 0) + (Number(b.drillTime) || 0);
    });
    return map;
  }, [session]);

  const breaks = session.blocks.filter(b => b.isBreak).length;
  const targetMins = session.targetMins;
  const hasTarget = targetMins !== "" && targetMins !== null && targetMins !== undefined && !isNaN(Number(targetMins)) && Number(targetMins) > 0;
  const isOverTarget = hasTarget && totalMins > Number(targetMins);

  return (
    <aside style={S.summaryPanel}>
      <div style={S.summaryHead}>Session summary</div>
      <div style={S.summaryBigStat}>
        <span style={{ ...S.summaryBigVal, color: isOverTarget ? "var(--blood)" : "var(--turf)" }}>{fmtMin(totalMins)}</span>
        <span style={S.summaryBigLabel}>total field time</span>
      </div>

      <div style={S.targetMinsRow}>
        <label style={S.targetMinsLabel}>Target length</label>
        <div style={S.targetMinsInputWrap}>
          <input
            type="number"
            min={0}
            style={S.targetMinsInput}
            placeholder="e.g. 90"
            value={targetMins ?? ""}
            onChange={e => onUpdateTarget(e.target.value)}
          />
          <span style={S.targetMinsUnit}>min</span>
        </div>
        {hasTarget && (
          <div style={{ ...S.targetMinsStatus, color: isOverTarget ? "var(--blood)" : "var(--turf)" }}>
            {isOverTarget
              ? `${fmtMin(totalMins - Number(targetMins))} over`
              : `${fmtMin(Number(targetMins) - totalMins)} to spare`}
          </div>
        )}
      </div>

      <div style={S.summaryMiniRow}>
        <div style={S.summaryMini}><span>{blockCount}</span><label>BLOCKS</label></div>
        <div style={S.summaryMini}><span>{breaks}</span><label>BREAKS</label></div>
      </div>

      <div style={S.summaryDivider} />
      <div style={S.summarySubHead}>Time by category</div>
      <div style={S.catBars}>
        {CATEGORIES.filter(c => byCategory[c.key]).map(c => {
          const pct = totalMins ? Math.round((byCategory[c.key] / totalMins) * 100) : 0;
          return (
            <div key={c.key} style={S.catBarRow}>
              <div style={S.catBarLabelRow}>
                <span>{c.label}</span>
                <span style={S.catBarMin}>{fmtMin(byCategory[c.key])}</span>
              </div>
              <div style={S.catBarTrack}>
                <div style={{ ...S.catBarFill, width: `${pct}%`, background: c.color }} />
              </div>
            </div>
          );
        })}
        {Object.keys(byCategory).length === 0 && (
          <div style={S.summaryEmptyNote}>Add drill blocks to see the time breakdown.</div>
        )}
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------
   DRILL PICKER MODAL (used inside builder)
----------------------------------------------------------------*/

function PlayPickerModal({ plays, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = plays.filter(p => (p.name || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>Attach a play</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={S.searchRow}>
          <Search size={15} color="var(--text-secondary)" />
          <input autoFocus style={S.searchInput} placeholder="Search saved plays…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <div style={S.summaryEmptyNote}>
            {plays.length === 0 ? "No plays saved yet for this squad — build one in the Plays tab first." : "No plays match that search."}
          </div>
        ) : (
          <div style={S.playPickerGrid}>
            {filtered.map(p => (
              <button key={p.id} style={S.playPickerCard} onClick={() => onPick(p.id)}>
                {p.thumb ? <img src={p.thumb} alt="" style={S.playPickerThumb} /> : <div style={S.playPickerThumbFallback}><Route size={20} /></div>}
                <span style={S.playPickerName}>{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillPickerModal({ drills, onPick, onClose, onCreateNew }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = drills.filter(d => {
    if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
    if (!query) return true;
    return (d.name || "").toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => a.name.localeCompare(b.name));

  const exactMatch = drills.some(d => d.name.toLowerCase() === query.toLowerCase().trim());

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeadRow}>
          <h3 style={S.modalTitle}>Choose a drill</h3>
          <button style={S.iconBtnGhost} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={S.searchRow}>
          <Search size={15} color="var(--text-secondary)" />
          <input autoFocus style={S.searchInput} placeholder="Search the drill library…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div style={S.filterChipRow}>
          <Chip active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>All</Chip>
          {CATEGORIES.map(c => <Chip key={c.key} active={typeFilter === c.key} onClick={() => setTypeFilter(c.key)} color={c.color}>{c.label}</Chip>)}
        </div>
        <div style={S.pickerList}>
          {filtered.map(d => (
            <div key={d.id} style={S.pickerRow} onClick={() => onPick(d)}>
              <span style={{ ...S.pickerDot, background: CATEGORY_MAP[d.type]?.color }} />
              <div style={{ flex: 1 }}>
                <div style={S.pickerNameRow}>
                  <span style={S.pickerName}>{d.name}</span>
                  {!!d.contact && (
                    <span style={{ ...S.drillContactTag, color: CONTACT_LEVELS[d.contact]?.color, borderColor: CONTACT_LEVELS[d.contact]?.color + "66" }}>
                      <Shield size={9} /> {CONTACT_LEVELS[d.contact]?.short}
                    </span>
                  )}
                </div>
                {d.desc && <div style={S.pickerDesc}>{d.desc}</div>}
                {d.videoUrl && (
                  <a
                    href={d.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.drillVideoLink}
                    onClick={e => e.stopPropagation()}
                  >
                    <PlayCircle size={12} /> Watch reference video
                  </a>
                )}
              </div>
            </div>
          ))}
          {query.trim() && !exactMatch && (
            <div style={S.pickerRowNew} onClick={() => onCreateNew(query.trim())}>
              <Plus size={14} /> Create new drill "{query.trim()}"
            </div>
          )}
          {filtered.length === 0 && !query.trim() && (
            <div style={S.summaryEmptyNote}>No drills match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   PDF EXPORT (print-friendly window)
----------------------------------------------------------------*/

function exportSessionPdf(session, team, totalMins, blockCount, squad) {
  const squadMap = Object.fromEntries((squad || []).map(p => [p.id, p.name]));

  const rows = session.blocks.map(b => {
    if (b.isBreak) {
      return `<tr class="break"><td colspan="9">${escapeHtml(b.label)}</td></tr>`;
    }
    const cat = CATEGORY_MAP[b.category] || {};
    const cl = CONTACT_LEVELS[b.contact || 0] || CONTACT_LEVELS[0];
    const notes = [b.focus, b.lookFor].filter(Boolean).join(b.focus && b.lookFor ? " — " : "");
    let teamsHtml = "";
    if (b.useTeams && b.teamSplit && b.teamSplit.assignments) {
      const count = b.teamSplit.teamCount || 2;
      const customNames = b.teamSplit.names || {};
      const byTeam = {};
      for (let i = 1; i <= count; i++) byTeam[i] = [];
      const assignedIds = new Set();
      Object.entries(b.teamSplit.assignments).forEach(([pid, t]) => {
        const name = squadMap[pid];
        if (name && byTeam[t]) {
          byTeam[t].push(name);
          assignedIds.add(pid);
        }
      });
      const unassignedNames = (squad || [])
        .filter(p => !assignedIds.has(p.id))
        .map(p => p.name)
        .sort();
      const teamCols = Object.entries(byTeam).map(([num, names]) => {
        const color = TEAM_COLORS[Number(num) - 1] || "#888";
        const label = escapeHtml(customNames[num] || `Team ${num}`);
        return `<div class="teamcol"><div class="teamcol-head" style="color:${color}">${label}</div>${names.map(n => `<div>${escapeHtml(n)}</div>`).join("") || '<div class="teamcol-empty">—</div>'}</div>`;
      }).join("");
      const unassignedCol = `<div class="teamcol teamcol-unassigned"><div class="teamcol-head">Not in this drill</div>${unassignedNames.map(n => `<div>${escapeHtml(n)}</div>`).join("") || '<div class="teamcol-empty">—</div>'}</div>`;
      teamsHtml = `<tr class="teamrow"><td colspan="9"><div class="teams-wrap">${teamCols}${unassignedCol}</div></td></tr>`;
    }
    return `<tr>
      <td><span class="tag" style="background:${cat.color}22;color:${cat.color}">${escapeHtml(cat.label || "")}</span></td>
      <td>${escapeHtml(b.drillName || "")}</td>
      <td>${b.drillTime || 0}'</td>
      <td>${escapeHtml(b.group || "")}</td>
      <td>${b.intensity || ""}</td>
      <td>${b.contact ? `<span class="tag" style="background:${cl.color}22;color:${cl.color}">${cl.short}</span>` : "—"}</td>
      <td>${escapeHtml(notes)}</td>
      <td>${escapeHtml(b.coaches || "")}</td>
      <td>${b.videoUrl ? `<a class="vid" href="${escapeHtml(b.videoUrl)}">Watch</a>` : ""}</td>
    </tr>${teamsHtml}`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(session.name || "Session")}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #16201a; padding: 32px; max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
    .stats { display: flex; gap: 24px; margin-bottom: 20px; }
    .stat { font-size: 13px; }
    .stat b { display:block; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #16201a; color: white; padding: 6px 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
    tr.break td { background: #f4f1ea; font-weight: bold; color: #8a6d3b; text-align: center; }
    tr.teamrow td { background: #f7f7f5; padding: 8px 8px 10px; border-bottom: 1px solid #ddd; }
    .teams-wrap { display: flex; gap: 18px; flex-wrap: wrap; }
    .teamcol { font-size: 11px; min-width: 90px; }
    .teamcol-head { font-weight: bold; margin-bottom: 3px; }
    .teamcol-empty { color: #999; }
    .teamcol-unassigned { border-left: 1px dashed #bbb; padding-left: 14px; }
    .teamcol-unassigned .teamcol-head { color: #777; }
    .tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .vid { color: #2F8FD6; text-decoration: none; font-weight: bold; }
    .print-hint { background: #eef6ff; border: 1px solid #bcdcff; color: #1a4d7a; font-size: 12.5px; padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; }
    @media print {
      body { padding: 12px; }
      .print-hint { display: none; }
      .vid::after { content: " (" attr(href) ")"; font-size: 9px; font-weight: normal; color: #555; }
    }
  </style></head><body>
  <div class="print-hint">Use your browser's Print option (Ctrl/Cmd + P) to print or save this as a PDF.</div>
  <h1>${escapeHtml(session.name || "Untitled session")}</h1>
  <div class="meta">${escapeHtml(team.name)} ${session.day ? "· " + escapeHtml(session.day) : ""} ${session.date ? "· " + escapeHtml(session.date) : ""} ${session.weekCode ? "· " + escapeHtml(session.weekCode) : ""}</div>
  <div class="stats">
    <div class="stat"><b>${totalMins}'</b>Total time</div>
    <div class="stat"><b>${blockCount}</b>Blocks</div>
    <div class="stat"><b>${escapeHtml(session.sessionSize || "")}</b>Session size</div>
  </div>
  ${session.theme ? `<div class="meta"><b>Theme:</b> ${escapeHtml(session.theme)}</div>` : ""}
  ${session.content ? `<div class="meta"><b>Content:</b> ${escapeHtml(session.content)}</div>` : ""}
  <table>
    <thead><tr><th>Category</th><th>Drill</th><th>Time</th><th>Group</th><th>Int.</th><th>Contact</th><th>Drill notes</th><th>Coach</th><th>Video</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const fileName = (session.name || "session").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".html";

  // Trigger a real file download — works regardless of popup blockers.
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return fileName;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------------------
   STYLES (design tokens — "pitch at night" theme)
----------------------------------------------------------------*/

function PlayPulseLogo({ size = 96, withBackground = false }) {
  const glyph = (
    <>
      <path
        d="M 66 296 L 168 296 L 168 154 L 344 154 L 344 296 L 446 296"
        fill="none"
        stroke="url(#ppLogoPulse)"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 446 296 L 412 278 L 412 314 Z" fill="#6BDB87" />
    </>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={withBackground ? "0 0 512 512" : "20 -3 474 474"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ppLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#131C16" />
          <stop offset="100%" stopColor="#0E1410" />
        </linearGradient>
        <linearGradient id="ppLogoPulse" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#3FA34D" />
          <stop offset="100%" stopColor="#6BDB87" />
        </linearGradient>
      </defs>
      {withBackground && (
        <>
          <rect width="512" height="512" rx="96" fill="url(#ppLogoBg)" />
          <rect x="6" y="6" width="500" height="500" rx="90" fill="none" stroke="#25322A" strokeWidth="2" />
        </>
      )}
      {glyph}
    </svg>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap');
      :root {
        --pitch: #0E1410;
        --pitch-2: #131C16;
        --pitch-3: #1A251E;
        --chalk: #F4F3EE;
        --turf: #3FA34D;
        --turf-dim: #2C7A39;
        --amber: #E8A33D;
        --blood: #C03B2B;
        --text-secondary: #9BA89C;
        --text-tertiary: #6B7870;
        --surface-1: #131C16;
        --surface-2: #1A251E;
        --border-1: #25322A;
        --border-2: #344038;
      }
      * { box-sizing: border-box; }
      body, input, select, textarea, button { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      input, select, textarea, button { font-family: inherit; }
      ::placeholder { color: var(--text-tertiary); }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--turf); outline-offset: 1px; }
      .team-name-input:hover, .team-name-input:focus { border-bottom-color: currentColor; outline: none; }
      button { cursor: pointer; }
      button:disabled { cursor: not-allowed; opacity: 0.5; }
      .scoreboard { font-family: 'Oswald', 'Arial Narrow', sans-serif; letter-spacing: 0.02em; }
      @keyframes toastIn {
        from { opacity: 0; transform: translate(-50%, 10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `}</style>
  );
}

const S = {
  appShell: { minHeight: "100vh", background: "var(--pitch)", color: "var(--chalk)", fontFamily: "Inter, -apple-system, sans-serif", position: "relative" },
  loadingScreen: { minHeight: "100vh", background: "var(--pitch)", display: "flex", alignItems: "center", justifyContent: "center" },
  loadingMark: { fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 36, letterSpacing: "0.02em", color: "var(--turf)" },
  loadingInline: { color: "var(--text-secondary)", padding: "2rem 0" },

  /* gate */
  gateWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  gateInner: { width: "100%", maxWidth: 560 },
  brandRow: { textAlign: "center", marginBottom: 40 },
  brandMark: { fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 42, letterSpacing: "0.01em", color: "var(--turf)", lineHeight: 1 },
  gateHeading: { fontFamily: "Oswald, sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 16, textAlign: "center" },
  teamGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 },
  teamCard: { position: "relative", background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: "20px 16px", cursor: "pointer", transition: "border-color .15s" },
  teamSwatch: { width: 28, height: 28, borderRadius: 8, marginBottom: 12 },
  teamCardName: { fontSize: 14, fontWeight: 500 },
  teamCardDel: { position: "absolute", top: 10, right: 10, background: "transparent", border: "none", color: "var(--text-tertiary)", padding: 4, borderRadius: 6 },
  teamCardNew: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px dashed var(--border-2)", borderRadius: 10, padding: "20px 16px", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 },
  newTeamForm: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: 28 },
  colorRow: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "16px 0" },
  colorDot: { width: 24, height: 24, borderRadius: "50%", border: "none", outlineOffset: 2, cursor: "pointer", flexShrink: 0 },
  gateActions: { display: "flex", gap: 8, justifyContent: "center", marginTop: 8 },

  /* shells */
  mainShell: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  topBar: { display: "flex", alignItems: "center", gap: 16, padding: "12px 24px", borderBottom: "1px solid var(--border-1)", background: "var(--pitch-2)", position: "sticky", top: 0, zIndex: 20 },
  topBarLeft: { display: "flex", alignItems: "center", gap: 12 },
  brandMarkSm: { fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--turf)", letterSpacing: "0.01em", whiteSpace: "nowrap" },
  crumbDivider: { width: 1, height: 20, background: "var(--border-2)" },
  teamPicker: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", position: "relative", padding: "6px 10px", borderRadius: 8, fontSize: 14 },
  teamDotSm: { width: 10, height: 10, borderRadius: "50%" },
  teamPickerName: { fontWeight: 500 },
  teamMenu: { position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, minWidth: 200, zIndex: 50, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  teamMenuItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer" },
  topNav: { display: "flex", gap: 4, flex: 1 },
  navBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-secondary)", fontSize: 13.5, fontWeight: 500 },
  navBtnActive: { background: "var(--surface-2)", color: "var(--chalk)" },
  mainBody: { flex: 1, padding: "28px 32px 60px" },

  /* buttons */
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--turf)", color: "#08130A", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600 },
  btnPrimarySm: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--turf)", color: "#08130A", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--chalk)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500 },
  iconBtn: { background: "transparent", border: "none", padding: 0 },
  iconBtnGhost: { background: "transparent", border: "1px solid var(--border-1)", borderRadius: 6, padding: 6, color: "var(--text-secondary)", display: "inline-flex" },
  linkBtn: { background: "transparent", border: "none", color: "var(--turf)", fontSize: 13, fontWeight: 500, padding: 0 },

  /* home */
  homeWrap: { maxWidth: 1100, margin: "0 auto" },
  homeHero: { marginBottom: 36 },
  homeHeroLabel: { color: "var(--turf)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 },
  homeHeroTitle: { fontFamily: "Oswald, sans-serif", fontSize: 38, fontWeight: 700, margin: "0 0 20px", letterSpacing: "0.01em" },
  homeStatRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 },
  statBox: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: "14px 16px" },
  statValue: { fontFamily: "Oswald, sans-serif", fontSize: 26, fontWeight: 700 },
  statLabel: { fontSize: 12, color: "var(--text-secondary)", marginTop: 2 },
  homeCols: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, marginTop: 36 },
  homeCol: {},
  sectionHeadRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 },
  sectionHead: { fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600, margin: 0 },

  /* focus & notes */
  focusSection: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: 20, marginBottom: 20 },
  focusAddRow: { display: "flex", gap: 8, marginTop: 14, marginBottom: 16 },
  focusChipWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  focusChipActive: { display: "inline-flex", alignItems: "center", gap: 7, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 20, padding: "6px 10px", fontSize: 13, fontWeight: 500 },
  focusChipDone: { display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "1px solid var(--border-1)", borderRadius: 20, padding: "6px 10px", fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)", textDecoration: "line-through" },
  focusChipToggle: { background: "transparent", border: "none", padding: 0, display: "flex" },
  focusChipRemove: { background: "transparent", border: "none", padding: 0, display: "flex", color: "var(--text-tertiary)" },
  focusNoteAddBox: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--border-1)" },
  focusNoteTextarea: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "9px 11px", color: "var(--chalk)", fontSize: 13, resize: "vertical", fontFamily: "inherit" },
  focusNoteList: { display: "flex", flexDirection: "column", gap: 10 },
  focusNoteRow: { display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, position: "relative" },
  focusNoteDate: { fontSize: 11, fontWeight: 700, color: "var(--turf)", textTransform: "uppercase", letterSpacing: "0.03em" },
  focusNoteText: { fontSize: 13.5, lineHeight: 1.5, paddingRight: 50 },
  focusNoteActions: { position: "absolute", top: 10, right: 10, display: "flex", gap: 4 },
  focusNoteEditBox: { display: "flex", flexDirection: "column", gap: 8 },
  sessionMiniList: { display: "flex", flexDirection: "column", gap: 8 },
  sessionMiniCard: { display: "flex", alignItems: "stretch", background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden", cursor: "pointer" },
  sessionMiniBar: { width: 5 },
  sessionMiniBody: { padding: "12px 16px", flex: 1 },
  sessionMiniTitle: { fontSize: 14, fontWeight: 500 },
  sessionMiniMeta: { fontSize: 12, color: "var(--text-secondary)", marginTop: 3 },
  quickGrid: { display: "flex", flexDirection: "column", gap: 10 },
  quickCard: { display: "flex", gap: 12, background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, padding: "14px 16px", cursor: "pointer" },
  quickCardIcon: { color: "var(--turf)", paddingTop: 2 },
  quickCardTitle: { fontSize: 14, fontWeight: 500 },
  quickCardBody: { fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 },

  /* programs */
  programGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 700 },
  programCard: { background: "var(--surface-1)", border: "1px solid", borderRadius: 14, padding: "26px 22px", cursor: "pointer" },
  programCardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  programCardIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" },
  programCardTitle: { fontFamily: "Oswald, sans-serif", fontSize: 19, fontWeight: 600, marginBottom: 6 },
  programCardMeta: { fontSize: 12.5, color: "var(--text-secondary)" },

  /* squads switcher */
  squadsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 },
  squadSwitchCard: { background: "var(--surface-1)", border: "1.5px solid", borderRadius: 12, padding: "18px 18px 14px" },
  squadSwitchTopRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  squadSwitchName: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  squadActiveTag: { fontSize: 11, color: "var(--turf)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 12 },
  squadSwitchActions: { display: "flex", alignItems: "center", gap: 8, marginTop: 14 },

  /* coaches */
  coachGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  coachCard: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: "16px 18px" },
  coachCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  coachCardName: { fontSize: 15, fontWeight: 600 },
  coachRoleTag: { fontSize: 10.5, fontWeight: 600, color: "var(--text-secondary)", border: "1px solid var(--border-2)", borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 },
  coachCardEmail: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 },
  coachSquadChips: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, minHeight: 22 },
  coachSquadChip: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, background: "var(--surface-2)", borderRadius: 12, padding: "3px 9px" },
  coachNoSquads: { fontSize: 11.5, color: "var(--text-tertiary)", fontStyle: "italic" },
  coachCardActions: { display: "flex", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border-1)" },
  coachSquadHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  coachSquadHeadActions: { display: "flex", alignItems: "center", gap: 6 },
  coachSquadPickList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", marginBottom: 6 },
  coachSquadPickRow: { display: "flex", alignItems: "center", gap: 9, width: "100%", background: "var(--surface-2)", border: "none", borderRadius: 7, padding: "8px 9px", textAlign: "left" },
  coachSquadPickName: { fontSize: 13, fontWeight: 500 },

  emptyState: { textAlign: "center", padding: "48px 24px", background: "var(--surface-1)", border: "1px dashed var(--border-2)", borderRadius: 12 },
  emptyIcon: { color: "var(--text-tertiary)", marginBottom: 10, display: "flex", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: 500, marginBottom: 4 },
  emptyBody: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, maxWidth: 360, marginLeft: "auto", marginRight: "auto" },

  /* page generic */
  pageWrap: { maxWidth: 1100, margin: "0 auto" },
  playCreatorFrame: { maxWidth: "none", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", padding: "0 16px" },
  playCreatorMount: { height: "calc(100vh - 190px)", minHeight: 560, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-1)", boxShadow: "0 10px 32px rgba(0,0,0,0.4)" },
  pageHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  pageHeadActions: { display: "flex", gap: 8 },
  pageTitle: { fontFamily: "Oswald, sans-serif", fontSize: 28, fontWeight: 700, margin: 0 },
  pageSub: { color: "var(--text-secondary)", fontSize: 13, marginTop: 4 },
  searchRow: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, maxWidth: 420 },
  searchInput: { flex: 1, background: "transparent", border: "none", color: "var(--chalk)", fontSize: 13.5 },
  filterChipRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  chip: { fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-2)", background: "transparent", color: "var(--text-secondary)", fontWeight: 500 },

  /* sessions */
  sessionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  sessionCard: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, overflow: "visible", position: "relative" },
  sessionCardTop: { padding: "16px 18px", cursor: "pointer" },
  sessionCardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 8 },
  sessionCardMetaRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  metaPill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, background: "var(--surface-2)", color: "var(--text-secondary)", padding: "3px 8px", borderRadius: 12 },
  sessionCardTheme: { fontSize: 12.5, color: "var(--text-secondary)", fontStyle: "italic" },
  sessionCardWeekRow: { marginTop: 8 },
  sessionWeekTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--turf)", fontWeight: 500 },
  sessionNoWeekTag: { display: "inline-flex", fontSize: 11, color: "var(--text-tertiary)" },
  assignPopover: { position: "absolute", top: "calc(100% + 6px)", right: 8, zIndex: 70, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, padding: 14, width: 220, boxShadow: "0 10px 28px rgba(0,0,0,0.5)" },
  assignPopoverTitle: { fontSize: 12.5, fontWeight: 600, marginBottom: 10 },
  assignPopoverPreview: { fontSize: 11, color: "var(--text-secondary)", marginTop: 8 },
  copyProgramList: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 4, maxHeight: 220, overflowY: "auto" },
  copyProgramRow: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", border: "none", borderRadius: 7, padding: "7px 8px", textAlign: "left", fontSize: 13 },
  copyProgramIcon: { width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  copyProgramLabel: { fontWeight: 500 },
  sessionCardActions: { display: "flex", gap: 6, padding: "10px 18px", borderTop: "1px solid var(--border-1)" },

  /* weeks view */
  weeksList: { display: "flex", flexDirection: "column", gap: 14 },
  weekCard: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, overflow: "hidden" },
  weekCardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", gap: 12 },
  weekCardHeadBtn: { display: "flex", alignItems: "flex-start", gap: 10, background: "transparent", border: "none", color: "var(--chalk)", textAlign: "left", flex: 1 },
  weekCardTitle: { fontFamily: "Oswald, sans-serif", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  weekCurrentBadge: { fontSize: 10.5, fontWeight: 600, color: "var(--turf)", background: "#3FA34D22", borderRadius: 10, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.03em" },
  weekCardSub: { fontSize: 12, color: "var(--text-secondary)", marginTop: 3 },
  weekSessionList: { borderTop: "1px solid var(--border-1)" },
  weekSessionRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border-1)" },
  weekSessionToggle: { background: "transparent", border: "none", padding: 0, display: "flex", flexShrink: 0 },
  weekSessionToggleOff: { width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--border-2)" },
  weekSessionMain: { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "baseline", cursor: "pointer", gap: 10 },
  weekSessionName: { fontSize: 13.5, fontWeight: 500 },
  weekSessionMeta: { fontSize: 11.5, color: "var(--text-secondary)", whiteSpace: "nowrap" },

  /* compare modal */
  compareModalCard: { background: "var(--pitch-2)", border: "1px solid var(--border-2)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 980, maxHeight: "85vh", overflowY: "auto" },
  compareGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" },
  compareCol: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden" },
  compareColHead: { width: "100%", textAlign: "left", background: "var(--surface-2)", border: "none", padding: "10px 12px", borderBottom: "1px solid var(--border-1)" },
  compareColTitle: { fontSize: 13, fontWeight: 600, color: "var(--chalk)" },
  compareColMeta: { fontSize: 11, color: "var(--text-secondary)", marginTop: 2 },
  compareColBlocks: { display: "flex", flexDirection: "column", gap: 5, padding: 8, maxHeight: 440, overflowY: "auto" },
  compareBlock: { borderLeft: "3px solid", background: "var(--surface-2)", borderRadius: 6, padding: "6px 8px" },
  compareBlockTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  compareBlockTime: { fontSize: 10.5, color: "var(--text-tertiary)", fontWeight: 600 },
  compareContactDot: { width: 7, height: 7, borderRadius: "50%" },
  compareBlockName: { fontSize: 12, marginTop: 2, lineHeight: 1.35 },
  compareBreak: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--amber)", padding: "4px 8px", justifyContent: "center" },

  /* template preview modal */
  previewModalCard: { background: "var(--pitch-2)", border: "1px solid var(--border-2)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", position: "relative" },
  previewSubline: { fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 },
  previewStatsRow: { display: "flex", gap: 8, marginBottom: 16 },
  previewBlockList: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto", marginBottom: 6 },
  previewBlockRow: { borderLeft: "3px solid", background: "var(--surface-2)", borderRadius: 7, padding: "8px 10px" },
  previewBlockHeadRow: { display: "flex", alignItems: "center", gap: 8 },
  previewBlockCat: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" },
  previewBlockTime: { fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, marginLeft: "auto" },
  previewBlockName: { fontSize: 13, fontWeight: 500, marginTop: 3 },
  previewBlockNotes: { fontSize: 11.5, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.4 },
  previewCopyPickerAnchor: { position: "absolute", bottom: 64, right: 24, zIndex: 70, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, padding: 14, width: 220, boxShadow: "0 10px 28px rgba(0,0,0,0.5)" },

  /* drill library */
  drillGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  drillCard: { display: "flex", background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden" },
  drillCardBar: { width: 4 },
  drillCardBody: { flex: 1, padding: "12px 14px" },
  drillCardTop: { display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  drillTypeTag: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  drillSubTag: { fontSize: 10.5, color: "var(--text-tertiary)", border: "1px solid var(--border-2)", borderRadius: 4, padding: "1px 5px" },
  drillContactTag: { display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, fontWeight: 700, border: "1px solid", borderRadius: 4, padding: "1px 5px" },
  drillCardName: { fontSize: 13.5, fontWeight: 500, marginBottom: 4 },
  drillCardDesc: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 },
  drillVideoLink: { display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, color: "var(--turf)", fontWeight: 500, textDecoration: "none" },
  drillCardActions: { display: "flex", flexDirection: "column", gap: 4, padding: 8, borderLeft: "1px solid var(--border-1)" },

  /* squad */
  squadTable: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "hidden" },
  squadHeadRow: { display: "grid", gridTemplateColumns: "2fr 0.7fr 2.1fr 80px", padding: "10px 16px", fontSize: 11.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border-1)" },
  squadRow: { display: "grid", gridTemplateColumns: "2fr 0.7fr 2.1fr 80px", padding: "11px 16px", alignItems: "center", borderBottom: "1px solid var(--border-1)", fontSize: 13.5 },
  squadName: { fontWeight: 500 },
  squadPos: { color: "var(--text-secondary)" },
  availPillRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  availPill: { fontSize: 10.5, fontWeight: 700, border: "1.5px solid", borderRadius: 12, padding: "3px 9px", background: "transparent", transition: "background 0.12s, color 0.12s" },
  squadRowActions: { display: "flex", gap: 6, justifyContent: "flex-end" },

  /* modal */
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modalCard: { background: "var(--pitch-2)", border: "1px solid var(--border-2)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto" },
  modalHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600, margin: 0 },
  modalChipRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 },

  /* bulk import */
  bulkTextarea: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "10px 12px", color: "var(--chalk)", fontSize: 13, marginBottom: 6, resize: "vertical", fontFamily: "monospace" },
  bulkHint: { fontSize: 11.5, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.5 },
  bulkDefaultsRow: { display: "flex", gap: 14, marginBottom: 16 },
  bulkPreviewHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 8, paddingTop: 10, borderTop: "1px solid var(--border-1)" },
  bulkDupNote: { color: "var(--amber)" },
  bulkPreviewList: { maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 },
  bulkPreviewRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--surface-2)" },
  bulkPreviewName: { flex: 1, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  bulkPreviewPosSelect: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "4px 6px", color: "var(--chalk)", fontSize: 12 },
  bulkDupTag: { fontSize: 10.5, color: "var(--amber)", fontWeight: 500, whiteSpace: "nowrap" },

  /* bulk copy to squads */
  bulkCopySourceName: { fontSize: 14, fontWeight: 600, marginBottom: 8 },
  bulkCopyHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 8 },
  bulkCopyHeadLabel: { fontSize: 11.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" },
  bulkCopyHeadActions: { display: "flex", alignItems: "center", gap: 6 },
  bulkCopyHeadDivider: { color: "var(--border-2)" },
  bulkCopyList: { maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 },
  bulkCopyRow: { display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, background: "var(--surface-2)", border: "none", width: "100%", textAlign: "left" },
  bulkCopyRowName: { fontSize: 13, fontWeight: 500, flexShrink: 0 },
  bulkCopyRowPreview: { fontSize: 11.5, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  /* inputs */
  input: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "10px 12px", color: "var(--chalk)", fontSize: 13.5, marginBottom: 14 },
  inputSm: { flex: 1, background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "8px 10px", color: "var(--chalk)", fontSize: 13 },
  textarea: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "10px 12px", color: "var(--chalk)", fontSize: 13.5, marginBottom: 6, resize: "vertical" },
  textareaSm: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "8px 10px", color: "var(--chalk)", fontSize: 12.5, resize: "vertical" },
  selectSm: { width: "100%", background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "7px 8px", color: "var(--chalk)", fontSize: 12.5 },
  fieldLabel: { display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 500 },
  fieldSmWrap: { display: "flex", flexDirection: "column", gap: 4, minWidth: 90 },
  fieldSmLabel: { fontSize: 10.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" },

  /* video link fields */
  videoInputRow: { display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: "9px 12px", marginBottom: 8 },
  videoInput: { flex: 1, background: "transparent", border: "none", color: "var(--chalk)", fontSize: 13 },
  videoWarning: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--amber)", marginBottom: 10 },
  videoPreviewLink: { display: "flex", alignItems: "center", gap: 10, padding: 8, background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 8, textDecoration: "none", marginBottom: 14 },
  videoPreviewThumb: { width: 64, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 },
  videoPreviewThumbFallback: { width: 64, height: 36, borderRadius: 5, background: "var(--surface-1)", color: "var(--turf)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  videoPreviewMeta: { display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" },
  videoPreviewProvider: { fontSize: 12, fontWeight: 500, color: "var(--chalk)" },
  videoPreviewUrl: { fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 },
  videoInputRowSm: { display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 7, padding: "6px 8px" },
  videoInputSm: { flex: 1, background: "transparent", border: "none", color: "var(--chalk)", fontSize: 12.5 },
  videoOpenLink: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, color: "var(--turf)", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 },
  blockVideoBtn: { display: "inline-flex", color: "var(--turf)", flexShrink: 0, padding: 2 },
  blockPlayBtn: { display: "inline-flex", color: "var(--turf)", flexShrink: 0, padding: 2, background: "transparent", border: "none" },
  attachedPlayRow: { display: "flex", alignItems: "center", gap: 8 },
  attachedPlayThumb: { width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-2)" },
  attachedPlayName: { fontSize: 12.5, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  playPickerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, maxHeight: 360, overflowY: "auto" },
  playPickerCard: { display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 8, cursor: "pointer", textAlign: "left" },
  playPickerThumb: { width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, background: "#10171b" },
  playPickerThumbFallback: { width: "100%", aspectRatio: "1", borderRadius: 6, background: "#10171b", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--turf)" },
  playPickerName: { fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  /* contact level picker */
  contactPickerWrap: { position: "relative", flexShrink: 0 },
  contactPickerBtn: { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid", borderRadius: 6, padding: "5px 7px", fontSize: 11.5, fontWeight: 700, background: "transparent" },
  contactPickerMenu: { position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, minWidth: 168, zIndex: 60, padding: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" },
  contactPickerOption: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 9px", borderRadius: 6, border: "none", fontSize: 12.5, textAlign: "left" },
  contactPickerDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },

  /* team split feature */
  teamsActiveBadge: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--turf)", background: "#3FA34D1A", border: "1px solid #3FA34D55", borderRadius: 6, padding: "3px 6px", flexShrink: 0 },
  teamsToggleRow: { display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: "10px 0 4px", marginTop: 4, width: "100%", textAlign: "left" },
  teamsToggleLabel: { fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500 },
  teamsToggleLabelOn: { fontSize: 12.5, color: "var(--chalk)", fontWeight: 600 },
  teamSplitEmpty: { fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" },
  teamSplitWrap: { marginTop: 10, border: "1px solid var(--border-1)", borderRadius: 10, padding: 12, background: "var(--surface-2)" },
  teamSplitToolbar: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  teamSplitToolbarActions: { display: "flex", gap: 6 },
  btnGhostXs: { display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--border-2)", borderRadius: 6, padding: "5px 9px", fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 500 },
  teamSplitBoard: { display: "flex", gap: 10, flexWrap: "wrap" },
  teamSplitPool: { background: "var(--surface-1)", border: "1px dashed var(--border-2)", borderRadius: 8, padding: 8, minWidth: 150, flex: "1 1 150px" },
  teamSplitPoolHead: { fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 },
  teamSplitCount: { fontSize: 10.5, color: "var(--text-tertiary)", fontWeight: 500 },
  teamSplitChipList: { display: "flex", flexDirection: "column", gap: 4, minHeight: 28 },
  teamSplitPoolEmpty: { fontSize: 11, color: "var(--text-tertiary)", padding: "4px 2px", fontStyle: "italic" },
  teamSplitTeamsGrid: { display: "flex", gap: 8, flexWrap: "wrap", flex: "2 1 300px" },
  teamSplitTeamCol: { background: "var(--surface-1)", border: "1px solid", borderRadius: 8, padding: 8, minWidth: 130, flex: "1 1 130px" },
  teamSplitTeamHeadRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  teamNameInput: { flex: 1, background: "transparent", border: "none", borderBottom: "1px dashed transparent", fontSize: 11, fontWeight: 700, padding: "1px 0", minWidth: 0 },
  teamSplitZoneOver: { background: "var(--pitch-3)", borderColor: "var(--turf)" },
  playerChip: { display: "flex", alignItems: "center", gap: 5, background: "var(--surface-2)", border: "1px solid", borderRadius: 6, padding: "5px 7px", cursor: "grab", fontSize: 11.5 },
  playerChipName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  playerChipPos: { fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 },
  playerChipAvailDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },

  /* builder */
  builderWrap: { maxWidth: 1280, margin: "0 auto" },
  builderTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 },
  builderTopActions: { display: "flex", gap: 8 },
  builderGrid: { display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" },
  builderMain: {},

  headerForm: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: 18, marginBottom: 20 },
  sessionNameInput: { width: "100%", background: "transparent", border: "none", color: "var(--chalk)", fontFamily: "Oswald, sans-serif", fontSize: 22, fontWeight: 600, marginBottom: 14, padding: 0 },
  headerFormRow: { display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" },
  headerFormRow2: { display: "flex", gap: 10 },
  sessionClock: { display: "flex", alignItems: "center", gap: 6, color: "var(--turf)", marginLeft: "auto", fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600 },
  sessionClockVal: {},

  timelineWrap: { position: "relative", display: "flex", gap: 14 },
  timelineRail: { width: 4, background: "var(--border-1)", borderRadius: 4, position: "relative", flexShrink: 0, marginTop: 4 },
  timelineRailFill: (mins) => ({ position: "absolute", top: 0, left: 0, width: "100%", height: `${Math.min(100, mins)}%`, background: "var(--turf)", borderRadius: 4, transition: "height .2s" }),
  timelineBlocks: { flex: 1, display: "flex", flexDirection: "column", gap: 8 },

  blockRow: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderLeft: "4px solid", borderRadius: 8 },
  blockRowMain: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" },
  blockGrip: { display: "flex", flexDirection: "column", alignItems: "center" },
  gripBtn: { background: "transparent", border: "none", color: "var(--text-tertiary)", padding: 1, lineHeight: 0 },
  categorySelect: { background: "transparent", border: "1px solid", borderRadius: 6, padding: "5px 6px", fontSize: 11.5, fontWeight: 600, maxWidth: 130 },
  drillNameBtn: { flex: 1, textAlign: "left", background: "transparent", border: "none", color: "var(--chalk)", fontSize: 13.5, padding: "6px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  drillNamePlaceholder: { color: "var(--text-tertiary)" },
  blockTimeWrap: { display: "flex", alignItems: "center", gap: 3, background: "var(--surface-2)", borderRadius: 6, padding: "3px 8px" },
  blockTimeInput: { width: 34, background: "transparent", border: "none", color: "var(--chalk)", fontSize: 13, textAlign: "right" },
  blockTimeUnit: { fontSize: 11, color: "var(--text-tertiary)" },
  blockNotesRow: { display: "flex", alignItems: "flex-start", gap: 7, padding: "0 14px 10px 38px" },
  blockNotesIcon: { marginTop: 4, flexShrink: 0 },
  blockNotesInput: { flex: 1, background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12.5, resize: "vertical", lineHeight: 1.4, fontFamily: "inherit", padding: 0, minHeight: 18 },
  blockDetails: { padding: "4px 14px 14px", borderTop: "1px solid var(--border-1)" },
  blockDetailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: 10, marginBottom: 10, marginTop: 10 },

  breakRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "var(--surface-2)", borderRadius: 8, color: "var(--amber)", fontSize: 12.5, fontWeight: 500, border: "1px dashed var(--border-2)" },
  breakLabel: { flex: 1 },
  breakActions: { display: "flex", gap: 4 },

  addBlockRow: { display: "flex", gap: 8, marginTop: 4 },
  addBlockBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", border: "1px dashed var(--border-2)", borderRadius: 8, background: "transparent", color: "var(--turf)", fontSize: 13, fontWeight: 500 },
  addBlockBtnGhost: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", border: "1px dashed var(--border-2)", borderRadius: 8, background: "transparent", color: "var(--amber)", fontSize: 13, fontWeight: 500 },

  /* summary panel */
  summaryPanel: { background: "var(--surface-1)", border: "1px solid var(--border-1)", borderRadius: 12, padding: 18, position: "sticky", top: 76 },
  summaryHead: { fontSize: 11.5, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  summaryBigStat: { display: "flex", flexDirection: "column", marginBottom: 16 },
  summaryBigVal: { fontFamily: "Oswald, sans-serif", fontSize: 34, fontWeight: 700, color: "var(--turf)" },
  summaryBigLabel: { fontSize: 12, color: "var(--text-secondary)" },
  targetMinsRow: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 8 },
  targetMinsLabel: { fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" },
  targetMinsInputWrap: { display: "flex", alignItems: "center", gap: 5 },
  targetMinsInput: { width: 64, background: "var(--surface-1)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "5px 8px", color: "var(--chalk)", fontSize: 14, fontWeight: 600 },
  targetMinsUnit: { fontSize: 12, color: "var(--text-tertiary)" },
  targetMinsStatus: { fontSize: 11.5, fontWeight: 600 },
  summaryMiniRow: { display: "flex", gap: 8 },
  summaryMini: { flex: 1, background: "var(--surface-2)", borderRadius: 8, padding: "8px 6px", textAlign: "center", display: "flex", flexDirection: "column", gap: 2 },
  summaryDivider: { height: 1, background: "var(--border-1)", margin: "18px 0 14px" },
  summarySubHead: { fontSize: 12.5, fontWeight: 500, marginBottom: 10 },
  catBars: { display: "flex", flexDirection: "column", gap: 10 },
  catBarRow: {},
  catBarLabelRow: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 },
  catBarMin: { color: "var(--text-secondary)" },
  catBarTrack: { height: 6, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 4 },
  summaryEmptyNote: { fontSize: 12, color: "var(--text-tertiary)" },

  /* picker modal */
  pickerList: { maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 },
  pickerRow: { display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 10px", borderRadius: 8, cursor: "pointer" },
  pickerDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  pickerNameRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pickerName: { fontSize: 13.5, fontWeight: 500 },
  pickerDesc: { fontSize: 12, color: "var(--text-secondary)", marginTop: 2 },
  pickerRowNew: { display: "flex", alignItems: "center", gap: 8, padding: "10px", borderRadius: 8, color: "var(--turf)", fontSize: 13, fontWeight: 500, border: "1px dashed var(--border-2)", cursor: "pointer", marginTop: 4 },

  /* toast */
  toast: { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--pitch-2)", border: "1.5px solid", borderRadius: 10, padding: "13px 22px", display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 500, zIndex: 200, boxShadow: "0 10px 32px rgba(0,0,0,0.55)", animation: "toastIn 0.25s ease-out" },
};
