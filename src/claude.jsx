import React, { useEffect, useReducer } from "react";
import ReactDOM from "react-dom/client";
import { Download } from "lucide-react";
// import { registerSW } from "virtual:pwa-register";
import bodyFatRangeIcon from "../SAMPLES/ICONS/Body_Fat_Range_Icon-removebg-preview.png";
import bodyWaterRangeIcon from "../SAMPLES/ICONS/Body_Water_Range_Icon-removebg-preview.png";
import muscleMassIcon from "../SAMPLES/ICONS/Muscle_Mass_Icon-removebg-preview.png";
import physiqueRatingsIcon from "../SAMPLES/ICONS/BMR_Icon-removebg-preview.png";
import basalMetabolicAgeIcon from "../SAMPLES/ICONS/Basal_Metabolic_Age_Icon-removebg-preview.png";
import boneMassIcon from "../SAMPLES/ICONS/Bone_Mass_Icon-removebg-preview.png";
import visceralFatIcon from "../SAMPLES/ICONS/Visceral_Fat_Icon-removebg-preview.png";
import wellnessLogo from "../SAMPLES/LOGO-removebg-preview.png";

const STORAGE_KEY = "wellness-form-state-v1";
const MAX_HISTORY = 100;
const APPOINTMENT_COUNT = 26;

const createEmptyAppointments = () =>
  Array.from({ length: APPOINTMENT_COUNT }, () => ({
    age: "",
    height: "",
    weight: "",
    bodyFat: "",
    water: "",
    muscle: "",
    physique: "",
    bmr: "",
    basal: "",
    bone: "",
    visceral: ""
  }));

const defaultEvaluation = {
  bodyFat: "",
  bodyWater: "",
  muscleMass: "",
  visceralFat: "",
  questionnaire: ""
};

const defaultPage2Data = {
  date: "",
  name: "",
  coach: ""
};

const defaultFormState = {
  appointments: createEmptyAppointments(),
  evaluation: defaultEvaluation,
  page2Data: defaultPage2Data
};

const normalizeAppointments = (appointments) => {
  const base = createEmptyAppointments();
  if (!Array.isArray(appointments)) return base;
  return base.map((row, index) => ({ ...row, ...(appointments[index] || {}) }));
};

const loadStoredState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFormState;
    const parsed = JSON.parse(raw);
    return {
      appointments: normalizeAppointments(parsed.appointments),
      evaluation: { ...defaultEvaluation, ...(parsed.evaluation || {}) },
      page2Data: { ...defaultPage2Data, ...(parsed.page2Data || {}) }
    };
  } catch (error) {
    return defaultFormState;
  }
};

const commitHistory = (state, next) => {
  if (state.present === next) return state;
  const past = [...state.past, state.present];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  return {
    past,
    present: next,
    future: []
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE": {
      const next = action.updater(state.present);
      return commitHistory(state, next);
    }
    case "UNDO": {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future]
      };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest
      };
    }
    case "CLEAR": {
      const next = {
        ...defaultFormState,
        page2Data: {
          ...defaultFormState.page2Data,
          coach: state.present.page2Data.coach
        }
      };
      return commitHistory(state, next);
    }
    default:
      return state;
  }
};

const WellnessForm = () => {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => ({
      past: [],
      present: loadStoredState(),
      future: []
    })
  );

  const { appointments, evaluation, page2Data } = state.present;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  useEffect(() => {
// registerSW({ immediate: true });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
  }, [state.present]);

  const updateAppointment = (index, field, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => {
        const nextAppointments = [...prev.appointments];
        nextAppointments[index] = { ...nextAppointments[index], [field]: value };
        return { ...prev, appointments: nextAppointments };
      }
    });
  };

  const updateEvaluation = (key, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        evaluation: { ...prev.evaluation, [key]: value }
      })
    });
  };

  const updatePage2Data = (field, value) => {
    dispatch({
      type: "UPDATE",
      updater: (prev) => ({
        ...prev,
        page2Data: { ...prev.page2Data, [field]: value }
      })
    });
  };

  const toTitleCase = (value) =>
    value
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");

  const formatDateForFilename = (value) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";

    const dashMatch = trimmed.match(/^(\d{2})-([A-Za-z]+)-(\d{4})$/);
    if (dashMatch) {
      const [, day, month, year] = dashMatch;
      return `${day}-${toTitleCase(month)} ${year}`;
    }

    const slashMatch = trimmed.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      const monthName = toTitleCase(
        new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", { month: "long" })
      );
      return `${day}-${monthName} ${year}`;
    }

    return trimmed.replace(/\s+/g, " ");
  };

  const buildPdfTitle = () => {
    const name = page2Data.name.trim();
    const coach = page2Data.coach.trim();
    const date = formatDateForFilename(page2Data.date);
    const parts = [];
    if (name) parts.push(name);
    if (date) parts.push(date);
    if (coach) parts.push(`Coach ${coach}`);
    const title = parts.length ? parts.join(" ") : "Personal Wellness Pass";
    return title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  };

  const exportToPDF = () => {
    const originalTitle = document.title;
    const nextTitle = buildPdfTitle();
    const appliedTitle = nextTitle || originalTitle;
    document.title = appliedTitle;
    const titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = appliedTitle;

    const handleAfterPrint = () => {
      document.title = originalTitle;
      if (titleEl) titleEl.textContent = originalTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    setTimeout(() => {
      window.print();
      // Fallback in case afterprint doesn't fire on some browsers.
      setTimeout(handleAfterPrint, 2000);
    }, 0);
  };

  const formatDateToDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const monthName = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const year = date.getFullYear();
    return `${day}-${monthName}-${year}`;
  };

  const setTodayDate = () => {
    updatePage2Data("date", formatDateToDisplay(new Date()));
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="flex flex-wrap justify-center gap-3 p-4 print:hidden">
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canUndo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Undo
        </button>
        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canRedo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Redo
        </button>
        <button
          onClick={() => dispatch({ type: "CLEAR" })}
          className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
        >
          Clear All
        </button>
        <button
          onClick={exportToPDF}
          className="bg-[#2f4f1f] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#243c18]"
        >
          <Download size={20} />
          Export as PDF
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg page-break print-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 print-split">
          <div className="p-4 text-xs leading-relaxed order-2 lg:order-2 print-col print-break tight-print">
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Physique Rating?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>Offers you the opportunity to set a desired Physique Rating from which you can tailor your health/fitness programme accordingly</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is monitoring Physique Rating important?</p>
                  <p>When a person increases their activity level their weight may not change but their balance of body fat and muscle may alter which will change the overall physique or body shape. The physique rating helps accurately guide through a diet and fitness programme</p>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Basal Metabolic Rate Indicator?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>The Basal Metabolic Rate (BMR) is the number of calories the body needs when at rest.</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is monitoring the Basal Metabolic Rate important?</p>
                  <p>Understanding the Basal Metabolic Rate will allow you to monitor the number of calories your body requires according to your Physique and lifestyle. The more muscle or general activity you take the more calories you require. The Basal Metabolic Rate level also decreases as the body ages</p>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-center">
                <div className="flex justify-center">
                  <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain" />
                </div>
                <p className="font-bold">What is Metabolic Age Rating?</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <p>Basal Metabolic Rate starts to decrease after the age of 16/17 years old. Your Metabolic Age Rating indicates what age level your body is currently rated at</p>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">Why is the Metabolic Age Rating important?</p>
                  <p>If the age indicated is higher than your actual age then you need to improve your Basal Metabolic Rate. Increasing exercise levels will build healthier muscle tissue which burn more calories, consequently improving your Metabolic Age Rating</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center mb-2">
                <div className="flex justify-center">
                  <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain" />
                </div>
                <div className="font-bold">Bone Mass:</div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div className="overflow-x-auto print-fit-table phone-fit-table">
                  <table className="w-full min-w-[360px] border-2 border-black text-xs mb-2">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="border border-black p-1" colSpan="3">Women</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1">Less than 50 Kg</th>
                        <th className="border border-black p-1">50 Kg to 75 Kg</th>
                        <th className="border border-black p-1">More than 75 Kg</th>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 text-center">1.95 Kg</td>
                        <td className="border border-black p-1 text-center">2.4 Kg</td>
                        <td className="border border-black p-1 text-center">2.95 Kg</td>
                      </tr>
                      <tr className="bg-blue-900 text-white">
                        <th className="border border-black p-1" colSpan="3">Men</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1">Less than 65 Kg</th>
                        <th className="border border-black p-1">65 Kg to 95 Kg</th>
                        <th className="border border-black p-1">More than 95 Kg</th>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 text-center">2.65 Kg</td>
                        <td className="border border-black p-1 text-center">3.29 Kg</td>
                        <td className="border border-black p-1 text-center">3.69 Kg</td>
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-[40px_1fr] gap-3 items-center mb-2">
                <div className="flex justify-center">
                  <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain" />
                </div>
                <div className="font-bold">Visceral Fat:</div>
              </div>

              <div className="mb-2 text-xs">
                <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                  <div />
                  <div className="grid grid-cols-[13ch_1fr] gap-y-1 pl-[13ch] font-bold">
                    <div className="text-[#1f7a1f]">1-4</div>
                    <div className="text-[#1f7a1f]">Excellent</div>
                    <div className="text-[#b35a00]">5-8</div>
                    <div className="text-[#b35a00]">Healthy</div>
                    <div className="text-[#e6c600]">9-12</div>
                    <div className="text-[#e6c600]">Bad</div>
                    <div className="text-[#a00]">Over 13</div>
                    <div className="text-[#a00]">Alarming</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
                <div />
                <div>
                  <p className="font-bold mb-1">What is Visceral Fat?</p>
                  <p>Fat that surrounds the vital organs in the trunk/ stomach area of the body.</p>
                  <p className="font-bold mb-1">Why is monitoring Visceral Fat important?</p>
                  <p>High Visceral Fat levels increase the risk of high blood pressure, heart disease and type 2 diabetes. Lowering your Visceral Fat levels can stabilise insulin action substantially, reducing your risk of diabetes and other related illnesses.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-full order-1 lg:order-1 print-col print-break cover-shell">
            <div className="absolute inset-0 bg-white cover-layer">
              <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <img src={wellnessLogo} alt="Herbalife logo" className="mx-auto mb-3 max-w-[220px]" />
                    <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-[#2f4f1f]">PERSONAL</h1>
                    <h2 className="text-5xl sm:text-6xl font-bold text-[#2f4f1f]">WELLNESS PASS</h2>
                  </div>
                </div>

                <div className="bg-white/95 p-6 m-4 sm:m-8">
                  <div className="mb-6">
                    <label className="block font-bold mb-2">Date:</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        className="flex-1 border-b-2 border-[#2f4f1f] p-2"
                        value={page2Data.date}
                        onChange={(e) => updatePage2Data("date", e.target.value)}
                        placeholder="DD-MONTH-YYYY"
                      />
                      <button
                        type="button"
                        onClick={setTodayDate}
                        className="border-2 border-[#2f4f1f] text-[#2f4f1f] px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-[#e7edd5]"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block font-bold mb-2">Name</label>
                    <input
                      type="text"
                      className="w-full border-b-2 border-[#2f4f1f] p-2"
                      value={page2Data.name}
                      onChange={(e) => updatePage2Data("name", e.target.value)}
                    />
                  </div>

                  <div className="border-2 border-[#2f4f1f] p-4 text-center">
                    <label className="block font-bold mb-2">Your Personal Wellness Coach</label>
                    <input
                      type="text"
                      className="w-full text-center p-2"
                      value={page2Data.coach}
                      onChange={(e) => updatePage2Data("coach", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg p-4 sm:p-6 page-break print-section">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch print-split">
          <div className="border-2 border-black flex flex-col h-full order-2 xl:order-2 print-col">
            <div className="border-b-2 border-black p-2 font-bold text-center text-sm">
              Please bring along this Pass to your next appointment
            </div>

            <div className="overflow-x-auto xl:overflow-x-visible print-fit-table phone-fit-table">
              <div className="min-w-[880px] xl:min-w-0 print-min-w-0 phone-fit-inner">
                <div className="grid grid-cols-11 text-xs border-b border-black">
                  <div className="border-r border-black p-1 text-center font-semibold">Age:</div>
                  <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                  <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                  <div className="border-r border-black p-1 text-center">Body Fat<br/>Range</div>
                  <div className="border-r border-black p-1 text-center">% Body<br/>Water<br/>Range</div>
                  <div className="border-r border-black p-1 text-center">Muscle<br/>Mass</div>
                  <div className="border-r border-black p-1 text-center">Physique<br/>Ratings</div>
                  <div className="border-r border-black p-1 text-center">BMR</div>
                  <div className="border-r border-black p-1 text-center">Basal<br/>Metabolic<br/>Age</div>
                  <div className="border-r border-black p-1 text-center">Bone<br/>Mass</div>
                  <div className="p-1 text-center">Visceral<br/>Fat</div>
                </div>

                <div className="grid grid-cols-11 text-xs border-b border-black bg-gray-50">
                  <div className="border-r border-black p-1 text-center text-xs">Your next<br/>appoint-<br/>ment</div>
                  <div className="border-r border-black p-1 text-center">Height<br/>cm</div>
                  <div className="border-r border-black p-1 text-center">Weight<br/>KG</div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={physiqueRatingsIcon} alt="Physique ratings" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={basalMetabolicAgeIcon} alt="Basal metabolic rate" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={basalMetabolicAgeIcon} alt="Basal metabolic age" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="border-r border-black p-1 flex justify-center items-center">
                    <img src={boneMassIcon} alt="Bone mass" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="p-1 flex justify-center items-center">
                    <img src={visceralFatIcon} alt="Visceral fat" className="h-9 w-9 object-contain" />
                  </div>
                </div>

                {appointments.map((apt, idx) => (
                  <div key={idx} className="grid grid-cols-11 text-xs border-b border-gray-300">
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.age}
                      onChange={(e) => updateAppointment(idx, "age", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.height}
                      onChange={(e) => updateAppointment(idx, "height", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.weight}
                      onChange={(e) => updateAppointment(idx, "weight", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bodyFat}
                      onChange={(e) => updateAppointment(idx, "bodyFat", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.water}
                      onChange={(e) => updateAppointment(idx, "water", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.muscle}
                      onChange={(e) => updateAppointment(idx, "muscle", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.physique}
                      onChange={(e) => updateAppointment(idx, "physique", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bmr}
                      onChange={(e) => updateAppointment(idx, "bmr", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.basal}
                      onChange={(e) => updateAppointment(idx, "basal", e.target.value)}
                    />
                    <input
                      className="border-r border-black p-0.5 text-center w-full text-xs"
                      value={apt.bone}
                      onChange={(e) => updateAppointment(idx, "bone", e.target.value)}
                    />
                    <input
                      className="p-0.5 text-center w-full text-xs"
                      value={apt.visceral}
                      onChange={(e) => updateAppointment(idx, "visceral", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto mb-[4px] text-xs">
              <table className="eval-table w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                  <col style={{ width: "16.66%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th className="bg-grey font-bold text-left pl-2">Evaluation</th>
                    <th className="font-normal">Excellent</th>
                    <th className="font-normal">Good</th>
                    <th className="font-normal">Medium</th>
                    <th className="font-normal">Bad</th>
                    <th className="font-normal">Alarming</th>
                  </tr>
                  {[
                    { key: "bodyFat", label: "Body Fat" },
                    { key: "bodyWater", label: "Body Water" },
                    { key: "muscleMass", label: "Muscle Mass" },
                    { key: "visceralFat", label: "Visceral Fat" },
                    { key: "questionnaire", label: "Questionnaire" }
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="bg-grey">{row.label}</td>
                      {[
                        { value: "excellent", className: "bg-excellent" },
                        { value: "good", className: "bg-good" },
                        { value: "medium", className: "bg-medium" },
                        { value: "bad", className: "bg-bad" },
                        { value: "alarming", className: "bg-alarming" }
                      ].map((option) => (
                        <td key={option.value} className={option.className}>
                          <input
                            type="radio"
                            name={`evaluation-${row.key}`}
                            checked={evaluation[row.key] === option.value}
                            onChange={() => updateEvaluation(row.key, option.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col h-full order-1 xl:order-1 print-col print-break">
            <div className="border-2 border-black mb-3">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={bodyFatRangeIcon} alt="Body fat range" className="h-9 w-9 object-contain" />
                <span className="font-bold">Body Fat Range:</span>
              </div>

              <div className="overflow-x-auto print-fit-table phone-fit-table">
                <table className="w-full min-w-[520px] text-[9px] border-collapse text-center mb-2">
                  <thead>
                    <tr className="font-bold" style={{ background: "#ffff99" }}>
                      <th className="border border-black p-1" colSpan="4">Women</th>
                      <th className="border border-black p-1">AGE</th>
                      <th className="border border-black p-1" colSpan="4">Men</th>
                    </tr>
                    <tr className="text-[8px] font-medium">
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                      <th className="border border-black p-1 font-normal" style={{ background: "#ffff99" }}></th>
                      <th className="border border-black p-1 font-normal">Excellent</th>
                      <th className="border border-black p-1 font-normal">Healthy</th>
                      <th className="border border-black p-1 font-normal">Medium</th>
                      <th className="border border-black p-1 font-normal">Obese</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    <tr>
                      <td className="border border-black p-1">18.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.0</td>
                      <td className="border border-black p-1">&gt; 29.6</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>20 - 24</td>
                      <td className="border border-black p-1">10.8</td>
                      <td className="border border-black p-1">14.9</td>
                      <td className="border border-black p-1">19.0</td>
                      <td className="border border-black p-1">&gt; 23.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">18.9</td>
                      <td className="border border-black p-1">22.0</td>
                      <td className="border border-black p-1">25.4</td>
                      <td className="border border-black p-1">&gt; 29.8</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>25 - 29</td>
                      <td className="border border-black p-1">12.8</td>
                      <td className="border border-black p-1">16.5</td>
                      <td className="border border-black p-1">20.3</td>
                      <td className="border border-black p-1">&gt; 24.3</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">19.7</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">26.4</td>
                      <td className="border border-black p-1">&gt; 30.5</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>30 - 34</td>
                      <td className="border border-black p-1">14.5</td>
                      <td className="border border-black p-1">18.0</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">&gt; 25.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">21.1</td>
                      <td className="border border-black p-1">24.0</td>
                      <td className="border border-black p-1">27.7</td>
                      <td className="border border-black p-1">&gt; 31.5</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>35 - 39</td>
                      <td className="border border-black p-1">16.1</td>
                      <td className="border border-black p-1">19.3</td>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">&gt; 26.1</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">22.6</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">29.3</td>
                      <td className="border border-black p-1">&gt; 32.8</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>40 - 44</td>
                      <td className="border border-black p-1">17.5</td>
                      <td className="border border-black p-1">20.5</td>
                      <td className="border border-black p-1">23.6</td>
                      <td className="border border-black p-1">&gt; 26.9</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">24.3</td>
                      <td className="border border-black p-1">27.3</td>
                      <td className="border border-black p-1">30.9</td>
                      <td className="border border-black p-1">&gt; 34.1</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>45 - 49</td>
                      <td className="border border-black p-1">18.6</td>
                      <td className="border border-black p-1">21.5</td>
                      <td className="border border-black p-1">24.5</td>
                      <td className="border border-black p-1">&gt; 27.6</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">25.2</td>
                      <td className="border border-black p-1">28.2</td>
                      <td className="border border-black p-1">31.8</td>
                      <td className="border border-black p-1">&gt; 35.1</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>50 - 54</td>
                      <td className="border border-black p-1">19.2</td>
                      <td className="border border-black p-1">22.1</td>
                      <td className="border border-black p-1">25.1</td>
                      <td className="border border-black p-1">&gt; 28.2</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">26.6</td>
                      <td className="border border-black p-1">29.7</td>
                      <td className="border border-black p-1">33.1</td>
                      <td className="border border-black p-1">&gt; 36.2</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>55 - 59</td>
                      <td className="border border-black p-1">19.8</td>
                      <td className="border border-black p-1">22.7</td>
                      <td className="border border-black p-1">25.6</td>
                      <td className="border border-black p-1">&gt; 28.7</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1">27.4</td>
                      <td className="border border-black p-1">30.7</td>
                      <td className="border border-black p-1">34.0</td>
                      <td className="border border-black p-1">&gt; 37.3</td>
                      <td className="border border-black p-1" style={{ background: "#ffff99" }}>60 +</td>
                      <td className="border border-black p-1">20.2</td>
                      <td className="border border-black p-1">23.3</td>
                      <td className="border border-black p-1">26.2</td>
                      <td className="border border-black p-1">&gt; 29.3</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2 text-xs">
                <p className="mb-1 leading-tight">For Sports people (measured in athletic modus) with a minimum training from 10 hours a week the Index is valid: Women 11 to 18 % / Men: 5 to 15%</p>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs italic">(University of Cambridge, 1999)</p>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <span className="font-bold">-</span>
                      <span className="border border-black px-3 py-1 text-xs">Under</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">0</span>
                      <span className="border border-black px-3 py-1 text-xs">Healthy</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">+</span>
                      <span className="border border-black px-3 py-1 text-xs">Over</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold">++</span>
                      <span className="border border-black px-3 py-1 text-xs">Obese</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black mb-3">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={bodyWaterRangeIcon} alt="Body water range" className="h-9 w-9 object-contain" />
                <span className="font-bold">Water Index:</span>
              </div>
              <div className="p-3 text-[10px]">
                <div className="flex justify-between mb-1 font-semibold text-[9px] pl-[68px]">
                  <span>30%</span><span>40%</span><span>50%</span><span>60%</span><span>70%</span><span>80%</span><span>90%</span>
                </div>
                <div className="mb-1 text-[8px] text-[#0b2d5c] font-bold">WHO 2001</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[60px] font-semibold">Women</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "33.33%", width: "6.67%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[60px] font-semibold">Men</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "50%", width: "8.33%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[60px] font-semibold">Children</div>
                  <div className="relative h-[10px] flex-1 border border-gray-300">
                    <div
                      className="h-full w-full"
                      style={{
                        background: "repeating-linear-gradient(90deg, #99ccff, #99ccff 2px, #fff 2px, #fff 4px)"
                      }}
                    />
                    <div className="absolute top-0 h-full bg-black" style={{ left: "58.33%", width: "16.67%" }} />
                  </div>
                </div>
              </div>
            </div>

              <div className="border-2 border-black flex-1 flex flex-col">
              <div className="p-2 flex items-center gap-2 text-sm font-normal">
                <img src={muscleMassIcon} alt="Muscle mass" className="h-9 w-9 object-contain" />
                <span className="font-bold">Muscle Index & Physique Ratings:</span>
              </div>
              <div className="p-3 text-xs muscle-section">
                <p className="mb-2">The Muscle Index is given in Kg, the value belonging to it is the Physique Ratings:</p>
                <div className="rating-box">
                  <div className="rating-columns">
                    <div className="col-red">
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px" }}>Obese, Untrained</div>
                      1 Hidden Obese<br/>
                      2 Obese<br/>
                      <span style={{ color: "#b35a00" }}>3 Solidly-built</span>
                    </div>
                    <div className="col-green">
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px", color: "#a00" }}>Normal</div>
                      <span style={{ color: "#e6c600" }}>4 Under Exercised</span><br/>
                      5 Standard<br/>
                      <span style={{ color: "#1f7a1f" }}>6 Standard Muscular</span>
                    </div>
                    <div className="col-black" style={{ color: "#a00" }}>
                      <div style={{ borderBottom: "1px solid #000", marginBottom: "2px" }}>Excellent</div>
                      <span style={{ color: "#1f7a1f" }}>7 Thin</span><br/>
                      <span style={{ color: "#1f7a1f" }}>8 Thin & Muscular</span><br/>
                      <span style={{ color: "#0f5a0f" }}>9 Very Muscular</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", textAlign: "justify" }}>
                  <strong>Why is monitoring Muscle Mass important?</strong> For every extra Kg of muscle gained the body uses approximately 100 extra calories a day. Everybody who experiences a change in the muscle mass should monitor and adapt the calorie intake accordingly. Because muscle is denser than fat, monitoring your muscle mass gives you a more accurate understanding of your overall body compositions and changes in your total body weight.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      

      <style>{`
        html, body, #root {
          height: auto;
          overflow-y: auto;
        }
        .page-break,
        .max-w-7xl,
        .max-w-4xl,
        .bg-gray-100 {
          overflow: visible;
        }
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }
          .print-split {
            display: flex !important;
            flex-direction: column;
          }
          .print-col {
            width: 100% !important;
          }
          .print-break {
            break-after: page;
            page-break-after: always;
          }
          .page-break {
            break-after: auto;
            page-break-after: auto;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-fit-table {
            overflow: visible !important;
          }
          .print-min-w-0 {
            min-width: 0 !important;
          }
        }
        @media print and (orientation: landscape) {
          @page {
            size: landscape;
            margin: 8mm;
          }
          .print-split {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .print-break {
            break-after: auto;
            page-break-after: auto;
          }
        }
        .tight-print {
          line-height: 1.2;
        }
        .tight-print .mb-4 {
          margin-bottom: 8px;
        }
        .tight-print .mb-3 {
          margin-bottom: 6px;
        }
        .tight-print .mb-2 {
          margin-bottom: 4px;
        }
        @media (max-width: 1023px) {
          .print-split {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .print-col {
            width: 100%;
          }
          .print-break {
            margin-bottom: 16px;
          }
          .cover-shell {
            height: auto;
          }
          .cover-layer {
            position: static;
          }
          .phone-fit-table {
            overflow: visible;
          }
          .phone-fit-table table {
            min-width: 0;
            width: 100%;
            font-size: 9px;
          }
          .phone-fit-inner {
            min-width: 0;
            width: 100%;
          }
          .phone-fit-inner .grid {
            grid-template-columns: repeat(11, minmax(0, 1fr));
          }
          .phone-fit-inner .grid > div,
          .phone-fit-inner input {
            font-size: 9px;
            padding: 2px;
            line-height: 1.2;
          }
        }
        .muscle-section { font-size: 10px; line-height: 1.3; }
        .rating-box { border: 2px solid #a00; padding: 5px; margin: 5px 0; }
        .rating-columns { display: flex; justify-content: space-between; gap: 8px; }
        .col-red { color: #a00; font-weight: bold; }
        .col-green { color: green; font-weight: bold; }
        .col-black { color: black; font-weight: bold; }
        table.eval-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        table.eval-table th, table.eval-table td { border: 1px solid #000; text-align: center; padding: 4px; }
        .bg-grey { background: transparent; font-weight: normal; }
        .bg-excellent { background: #ffff99; }
        .bg-good { background: #ffcc99; }
        .bg-medium { background: #ff9966; }
        .bg-bad { background: #ff6666; }
        .bg-alarming { background: #cc0000; color: white; }
        .eval-table input[type="radio"],
        .eval-table input[type="checkbox"] {
          accent-color: #000;
        }
      `}</style>

      <div className="flex flex-wrap justify-center gap-3 p-4 print:hidden">
        <button
          onClick={() => dispatch({ type: "UNDO" })}
          disabled={!canUndo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canUndo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Undo
        </button>
        <button
          onClick={() => dispatch({ type: "REDO" })}
          disabled={!canRedo}
          className={`px-4 py-2 rounded border text-sm font-semibold ${
            canRedo ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Redo
        </button>
        <button
          onClick={() => dispatch({ type: "CLEAR" })}
          className="px-4 py-2 rounded border text-sm font-semibold bg-white hover:bg-gray-100"
        >
          Clear All
        </button>
        <button
          onClick={exportToPDF}
          className="bg-[#2f4f1f] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#243c18]"
        >
          <Download size={20} />
          Export as PDF
        </button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WellnessForm />);

