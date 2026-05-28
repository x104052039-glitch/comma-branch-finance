import React, { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, CheckCircle2, Circle, Plus, Edit2, Trash2, FileDown, FilePlus2, RotateCcw, CloudUpload, Check, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";


// Google Sheets API 資料型別
interface Branch {
  分校ID: string;
  分校名稱: string;
  啟用: boolean;
  建立時間: string;
}

interface Template {
  主檔ID: string;
  分校: string;
  類別: string;
  項目: string;
  預設金額: string;
  預設截止日: number;
  備註: string;
  啟用: boolean;
}

interface Record {
  ID: string;
  月份: string;
  分校: string;
  類別: string;
  項目: string;
  完成狀態: boolean;
  截止日: string;
  繳費日期: string;
  金額: string;
  備註: string;
  更新時間: string;
}

interface ApiResponse {
  ok: boolean;
  branches: Branch[];
  templates: Template[];
  records: Record[];
}

// 支出項目資料型別
interface ExpenseItem {
  id: string;
  name: string;
  deadline: string;
  amount: string;
  note: string;
  paymentDate?: string;
  completed: boolean;
  status: "已完成" | "未完成";
}

interface ExpenseCategory {
  category: string;
  color: string;
  items: ExpenseItem[];
}

// 固定支出主檔模板項目（用於生成新月份）
interface TemplateItem {
  name: string;
  defaultDay: number; // 每月固定繳費日期（日）
  defaultAmount?: string; // 預設金額
  note: string;
}

interface ExpenseTemplate {
  category: string;
  items: TemplateItem[];
}

// API URL
const API_URL = "https://script.google.com/macros/s/AKfycbzUXfFlwJvG6ylckjKbzDD7OY0bHJUJn2GDtEwo7TA-7Z7o_lG_VWeiYLGKZ2n7n_ji/exec";

// 使用 JSONP 方式獲取資料
const loadDataByJsonp = (): Promise<{ data: ApiResponse | null; error: string | null }> => {
  return new Promise((resolve) => {
    const callbackName = `jsonpCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeoutDuration = 15000; // 15 秒超時

    console.log("正在使用 JSONP 呼叫 API:", `${API_URL}?action=getData&callback=${callbackName}`);

    // 設置超時處理
    const timeout = setTimeout(() => {
      cleanup();
      console.error("JSONP 請求超時");
      resolve({
        data: null,
        error: "請求超時，請檢查網路連線",
      });
    }, timeoutDuration);

    // 清理函數
    const cleanup = () => {
      clearTimeout(timeout);
      // 移除 script tag
      const script = document.getElementById(callbackName);
      if (script) {
        script.remove();
      }
      // 清除全局 callback
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
    };

    // 設置全局 callback 函數
    (window as any)[callbackName] = (data: any) => {
      cleanup();
      console.log("JSONP 回傳資料:", data);

      if (data && data.ok) {
        resolve({ data, error: null });
      } else {
        console.warn("API 回傳資料格式不正確:", data);
        resolve({
          data: null,
          error: "API 回傳資料格式不正確",
        });
      }
    };

    // 創建 script tag
    const script = document.createElement("script");
    script.id = callbackName;
    script.src = `${API_URL}?action=getData&callback=${callbackName}`;
    script.async = true;

    // 處理載入錯誤
    script.onerror = () => {
      cleanup();
      console.error("JSONP script 載入失敗");
      resolve({
        data: null,
        error: "資料載入失敗，請檢查網路連線",
      });
    };

    // 添加到 DOM
    document.head.appendChild(script);
  });
};

// 使用 JSONP 方式寫入單筆資料到 Google Sheets
const saveRecordByJsonp = (record: Record): Promise<{ success: boolean; error: string | null }> => {
  return new Promise((resolve) => {
    const callbackName = `saveRecordCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeoutDuration = 15000; // 15 秒超時

    // 準備寫入的資料（移除金額的千分位逗號）
    const recordToSave = {
      ID: record.ID,
      月份: record.月份,
      分校: record.分校,
      類別: record.類別,
      項目: record.項目,
      完成狀態: record.完成狀態,
      截止日: record.截止日,
      繳費日期: record.繳費日期 || "",
      金額: String(record.金額 || "").replace(/,/g, ""),
      備註: record.備註 || "",
    };

    console.log("🌐 正在寫入 Google Sheets:", recordToSave);
    console.log("   API URL:", API_URL);
    console.log("   Callback:", callbackName);

    // 設置超時處理
    const timeout = setTimeout(() => {
      cleanup();
      console.error("寫入 Google Sheets 超時");
      resolve({
        success: false,
        error: "請求超時",
      });
    }, timeoutDuration);

    // 清理函數
    const cleanup = () => {
      clearTimeout(timeout);
      const script = document.getElementById(callbackName);
      if (script) {
        script.remove();
      }
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
    };

    // 設置全局 callback 函數
    (window as any)[callbackName] = (result: any) => {
      cleanup();
      console.log("🔙 Google Sheets 寫入結果:", result);

      if (result && result.ok) {
        console.log("✅ 資料已成功寫入 Google Sheets");
        resolve({ success: true, error: null });
      } else {
        console.error("❌ 寫入 Google Sheets 失敗:", result);
        resolve({
          success: false,
          error: result?.message || "寫入失敗",
        });
      }
    };

    // 創建 script tag
    const script = document.createElement("script");
    script.id = callbackName;
    const scriptUrl = `${API_URL}?action=saveRecord&record=${encodeURIComponent(
      JSON.stringify(recordToSave)
    )}&callback=${callbackName}`;
    script.src = scriptUrl;
    script.async = true;

    console.log("📡 發送 JSONP 請求:", scriptUrl);

    // 處理載入錯誤
    script.onerror = () => {
      cleanup();
      console.error("❌ 寫入 Google Sheets script 載入失敗");
      resolve({
        success: false,
        error: "資料同步失敗，請檢查網路或 API 設定",
      });
    };

    // 添加到 DOM
    document.head.appendChild(script);
    console.log("✓ Script tag 已加入 DOM");
  });
};

// 轉換 Google Sheets 的完成狀態為 boolean
const convertCompletedStatus = (status: any): boolean => {
  if (typeof status === "boolean") return status;
  if (typeof status === "string") {
    const normalized = status.toLowerCase().trim();
    return normalized === "true" || normalized === "已完成";
  }
  return false;
};

// 使用 JSONP 方式批次寫入多筆資料到 Google Sheets
const saveMultipleRecordsByJsonp = (
  recordsToSave: Record[]
): Promise<{ success: boolean; error: string | null; savedCount: number }> => {
  return new Promise((resolve) => {
    const callbackName = `saveMultipleCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeoutDuration = 30000; // 30 秒超時

    console.log("正在批次寫入資料，共", recordsToSave.length, "筆");

    // 準備寫入的資料
    const recordsData = recordsToSave.map((record) => ({
      ID: record.ID,
      月份: record.月份,
      分校: record.分校,
      類別: record.類別,
      項目: record.項目,
      完成狀態: record.完成狀態,
      截止日: record.截止日,
      繳費日期: record.繳費日期 || "",
      金額: String(record.金額 || "").replace(/,/g, ""),
      備註: record.備註 || "",
    }));

    const timeout = setTimeout(() => {
      cleanup();
      console.error("批次寫入超時");
      resolve({
        success: false,
        error: "請求超時",
        savedCount: 0,
      });
    }, timeoutDuration);

    const cleanup = () => {
      clearTimeout(timeout);
      const script = document.getElementById(callbackName);
      if (script) {
        script.remove();
      }
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
    };

    (window as any)[callbackName] = (result: any) => {
      cleanup();
      console.log("批次寫入結果:", result);

      if (result && result.ok) {
        resolve({
          success: true,
          error: null,
          savedCount: result.count || recordsData.length,
        });
      } else {
        resolve({
          success: false,
          error: result?.message || "批次寫入失敗",
          savedCount: 0,
        });
      }
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.src = `${API_URL}?action=saveMultipleRecords&records=${encodeURIComponent(
      JSON.stringify(recordsData)
    )}&callback=${callbackName}`;
    script.async = true;

    script.onerror = () => {
      cleanup();
      console.error("批次寫入 script 載入失敗");
      resolve({
        success: false,
        error: "資料寫入失敗，請檢查網路或 API 設定",
        savedCount: 0,
      });
    };

    document.head.appendChild(script);
  });
};

// 固定支出主檔模板（用於生成新月份）
const expenseTemplates: ExpenseTemplate[] = [
  {
    category: "環境",
    items: [
      { name: "芳香劑", defaultDay: 10, note: "每月20號繳納後上ERP" },
    ],
  },
  {
    category: "水電費",
    items: [
      { name: "1樓水費", defaultDay: 15, defaultAmount: "1,200", note: "" },
      { name: "2樓水費", defaultDay: 15, defaultAmount: "1,500", note: "" },
      { name: "3樓水費", defaultDay: 15, defaultAmount: "1,800", note: "" },
      { name: "樹屋水費", defaultDay: 15, note: "" },
      { name: "1樓電費", defaultDay: 20, defaultAmount: "8,500", note: "" },
      { name: "2樓電費", defaultDay: 20, defaultAmount: "9,200", note: "" },
      { name: "3樓電費", defaultDay: 20, defaultAmount: "7,800", note: "" },
    ],
  },
  {
    category: "電信費",
    items: [
      { name: "中華電信網路費", defaultDay: 5, defaultAmount: "2,500", note: "3/31上ERP（繳費期限4/7）" },
      { name: "中華電信電話費", defaultDay: 5, defaultAmount: "1,200", note: "" },
      { name: "毅通網路電話費", defaultDay: 8, defaultAmount: "3,800", note: "10-12月、1-3月費用；4/14上ERP" },
    ],
  },
  {
    category: "影印費",
    items: [
      { name: "影印機費用", defaultDay: 25, defaultAmount: "4,500", note: "點擊新增..." },
    ],
  },
  {
    category: "房租",
    items: [
      { name: "每月房租（265號）", defaultDay: 1, defaultAmount: "70,000", note: "最後繳費1/30，繳到12月；每月1..." },
      { name: "每月樹屋房租（235號）", defaultDay: 1, defaultAmount: "15,000", note: "區間12/03-01/27；單數月收" },
    ],
  },
  {
    category: "勞工相關",
    items: [
      { name: "勞保費", defaultDay: 30, defaultAmount: "28,500", note: "區間10/03-12/02（已繳）" },
      { name: "健保費", defaultDay: 30, defaultAmount: "18,200", note: "" },
      { name: "勞退費", defaultDay: 30, defaultAmount: "12,800", note: "已繳2025/8-2026/7" },
    ],
  },
];

// 生成單一分校的初始資料
const generateCampusData = (year: string, month: string, campusIndex: number) => {
  const categories: ExpenseCategory[] = expenseTemplates.map((template, catIndex) => ({
    category: template.category,
    color: "bg-blue-50",
    items: template.items.map((templateItem, itemIndex) => {
      // 前3個分校設為部分完成，後4個分校設為大部分未完成
      const isCompleted = campusIndex < 3 ? Math.random() > 0.3 : Math.random() > 0.85;
      return {
        id: `${year}-${month}-campus${campusIndex}-${template.category}-${itemIndex}`,
        name: templateItem.name,
        deadline: `${year}/${month}/${templateItem.defaultDay}`,
        amount: isCompleted ? (templateItem.defaultAmount || "") : "",
        note: templateItem.note,
        paymentDate: isCompleted ? `${year}/${month}/${templateItem.defaultDay + 2}` : "",
        completed: isCompleted,
        status: isCompleted ? "已完成" : "未完成",
      };
    }),
  }));

  // 計算 KPI
  const allItems = categories.flatMap((cat) => cat.items);
  const completedItems = allItems.filter((item) => item.completed).length;
  const pendingItems = allItems.length - completedItems;
  const completedAmount = allItems
    .filter((item) => item.completed && item.amount)
    .reduce((sum, item) => sum + parseFloat(item.amount.replace(/,/g, "") || "0"), 0);

  return {
    categories,
    kpi: {
      totalItems: allItems.length,
      completedItems,
      pendingItems,
      completedAmount: Math.round(completedAmount),
    },
  };
};

// 生成月份資料
const generateMonthData = (year: string, month: string): MonthData => {
  const campuses: MonthData["campuses"] = {};
  const campusList = [
    "soar",
    "wings",
    "dawn",
    "aurora",
    "forest",
    "cloud",
    "wisdom",
  ];

  campusList.forEach((campusId, index) => {
    campuses[campusId] = generateCampusData(year, month, index);
  });

  return { campuses };
};

// 月份資料結構
const defaultMonthlyData: { [key: string]: MonthData } = {
  "115年3月": generateMonthData("115", "3"),
  "115年4月": generateMonthData("115", "4"),
  "115年5月": generateMonthData("115", "5"),
  "115年6月": generateMonthData("115", "6"),
};

// localStorage 相關函數
const STORAGE_RECORDS_KEY = "branchExpenseRecords";
const STORAGE_SELECTED_MONTH_KEY = "selectedMonth";
const STORAGE_SELECTED_CAMPUS_KEY = "selectedCampus";

// 從 localStorage 讀取資料
const loadFromLocalStorage = (): {
  records: Record[];
  selectedMonth: string;
  selectedCampus: string;
} => {
  try {
    const savedRecords = localStorage.getItem(STORAGE_RECORDS_KEY);
    const savedMonth = localStorage.getItem(STORAGE_SELECTED_MONTH_KEY);
    const savedCampus = localStorage.getItem(STORAGE_SELECTED_CAMPUS_KEY);

    return {
      records: savedRecords ? JSON.parse(savedRecords) : [],
      selectedMonth: savedMonth || "115年6月",
      selectedCampus: savedCampus || "soar",
    };
  } catch (error) {
    console.error("Failed to load data from localStorage:", error);
    return {
      records: [],
      selectedMonth: "115年6月",
      selectedCampus: "soar",
    };
  }
};

// 儲存到 localStorage
const saveToLocalStorage = (records: Record[], selectedMonth: string, selectedCampus: string) => {
  try {
    localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records));
    localStorage.setItem(STORAGE_SELECTED_MONTH_KEY, selectedMonth);
    localStorage.setItem(STORAGE_SELECTED_CAMPUS_KEY, selectedCampus);
  } catch (error) {
    console.error("Failed to save data to localStorage:", error);
  }
};

// 清除 localStorage
const clearLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_RECORDS_KEY);
    localStorage.removeItem(STORAGE_SELECTED_MONTH_KEY);
    localStorage.removeItem(STORAGE_SELECTED_CAMPUS_KEY);
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
};

// 分校列表定義
const campusList = [
  { id: "soar", name: "翱翔校" },
  { id: "wings", name: "展翅校" },
  { id: "dawn", name: "晨光校" },
  { id: "aurora", name: "極光校" },
  { id: "forest", name: "森耀校" },
  { id: "cloud", name: "騰雲校" },
  { id: "wisdom", name: "知行校" },
];


export function ExpenseManagementSystem() {
  // 從 localStorage 載入資料
  const initialData = loadFromLocalStorage();

  const [selectedCampus, setSelectedCampus] = useState(initialData.selectedCampus);
  const [viewMode, setViewMode] = useState<"detail" | "overview">("detail");
  const [selectedMonth, setSelectedMonth] = useState(initialData.selectedMonth);
  const [showNewMonthDialog, setShowNewMonthDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newMonthYear, setNewMonthYear] = useState("115");
  const [newMonthMonth, setNewMonthMonth] = useState("7");

  // API 資料狀態
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  // 同步狀態
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  // 載入 API 資料
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // 使用 JSONP 方式載入資料
      const { data, error } = await loadDataByJsonp();

      if (data) {
        // API 成功，使用 API 資料
        console.log("✅ 成功載入 API 資料");
        setApiData(data);

        const filteredBranches = data.branches.filter((b) => b.啟用);
        const filteredTemplates = data.templates.filter((t) => t.啟用);

        setBranches(filteredBranches);
        setTemplates(filteredTemplates);

        // 轉換完成狀態
        const convertedRecords = data.records.map((record) => ({
          ...record,
          完成狀態: convertCompletedStatus(record.完成狀態),
        }));
        setRecords(convertedRecords);

        // 除錯資訊
        console.log("API 回傳 branches:", filteredBranches);
        console.log("API 回傳 templates:", filteredTemplates);
        console.log("API 回傳 records:", convertedRecords);
        console.log("records 總筆數:", convertedRecords.length);
        console.log("115年6月筆數:", convertedRecords.filter(r => String(r.月份 || "").trim() === "115年6月").length);
        console.log("目前 selectedMonth:", selectedMonth);
        console.log("目前月份筆數:", convertedRecords.filter(r => String(r.月份 || "").trim() === selectedMonth).length);

        // 將 API 資料同步到 localStorage（作為備援）
        saveToLocalStorage(convertedRecords, selectedMonth, selectedCampus);

        setApiError(false);
        setApiErrorMessage("");
      } else {
        // API 失敗，檢查 localStorage 是否有資料
        const localData = loadFromLocalStorage();
        if (localData.records.length > 0) {
          console.warn("⚠️ API 讀取失敗，使用 localStorage 備援資料");
          setRecords(localData.records);
          // 從 records 提取分校資訊（簡化版）
          const uniqueBranches = Array.from(
            new Set(localData.records.map((r) => r.分校))
          ).map((name, index) => ({
            分校ID: `local-${index}`,
            分校名稱: name,
            啟用: true,
            建立時間: "",
          }));
          setBranches(uniqueBranches);
          setApiError(false);
          setApiErrorMessage("");
        } else {
          // 完全沒有資料
          console.error("❌ API 讀取失敗且無 localStorage 資料");
          setApiError(true);
          setApiErrorMessage(error || "未知錯誤");
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, []);

  // 當資料變動時自動儲存到 localStorage（僅在 API 成功載入後才儲存）
  useEffect(() => {
    if (!isLoading && !apiError && records.length > 0) {
      saveToLocalStorage(records, selectedMonth, selectedCampus);
    }
  }, [records, selectedMonth, selectedCampus, isLoading, apiError]);

  // 從 records 轉換為系統使用的資料結構
  const convertRecordsToData = (
    records: Record[],
    branches: Branch[],
    selectedMonth: string,
    selectedCampus: string
  ) => {
    // 將分校 ID 轉換為分校名稱
    const currentBranchName = branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || "";

    console.log("篩選條件 - 月份:", selectedMonth, "分校ID:", selectedCampus, "分校名稱:", currentBranchName);

    // 篩選當前月份和分校的資料（使用分校名稱比對）
    const filteredRecords = records.filter((r) => {
      const monthMatch = String(r.月份 || "").trim() === selectedMonth;
      const branchMatch = String(r.分校 || "").trim() === currentBranchName;
      return monthMatch && branchMatch;
    });

    console.log("篩選結果筆數:", filteredRecords.length);

    if (filteredRecords.length === 0) {
      return null;
    }

    // 按類別分組
    const categoriesMap = new Map<string, ExpenseItem[]>();

    filteredRecords.forEach((record) => {
      const category = record.類別;
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }

      categoriesMap.get(category)!.push({
        id: record.ID,
        name: record.項目,
        deadline: record.截止日,
        amount: record.金額 || "",
        note: record.備註 || "",
        paymentDate: record.繳費日期 || "",
        completed: record.完成狀態,
        status: record.完成狀態 ? "已完成" : "未完成",
      });
    });

    // 轉換為 ExpenseCategory 陣列
    const categories: ExpenseCategory[] = Array.from(categoriesMap.entries()).map(
      ([categoryName, items]) => ({
        category: categoryName,
        color: "bg-blue-50",
        items,
      })
    );

    // 計算 KPI
    const allItems = categories.flatMap((cat) => cat.items);
    const completedItems = allItems.filter((item) => item.completed).length;
    const pendingItems = allItems.length - completedItems;
    const completedAmount = allItems
      .filter((item) => item.completed && item.amount)
      .reduce((sum, item) => {
        const amountStr = String(item.amount || "").replace(/,/g, "");
        return sum + parseFloat(amountStr || "0");
      }, 0);

    return {
      categories,
      kpi: {
        totalItems: allItems.length,
        completedItems,
        pendingItems,
        completedAmount: Math.round(completedAmount),
      },
    };
  };

  // 獲取可用月份列表（從 records 中提取）
  const availableMonths = Array.from(new Set(records.map((r) => String(r.月份 || "").trim()))).filter(m => m).sort();

  // 獲取當前月份和分校的資料
  const currentCampusData = convertRecordsToData(records, branches, selectedMonth, selectedCampus);

  // 分校列表（從 API 獲取的 branches）
  const campusList = branches.map((b) => ({
    id: b.分校ID,
    name: b.分校名稱,
  }));

  // 計算分校完成狀態（用於紅點顯示）
  const getCampusCompleted = (campusId: string) => {
    const campusData = convertRecordsToData(records, branches, selectedMonth, campusId);
    // 如果沒有資料，視為已完成（不顯示紅點）
    return campusData ? campusData.kpi.pendingItems === 0 : true;
  };

  // 計算全校區統計
  const calculateGlobalKPI = () => {
    const monthRecords = records.filter((r) => String(r.月份 || "").trim() === selectedMonth);

    if (monthRecords.length === 0) {
      return { totalPending: 0, totalCompleted: 0, totalAmount: 0, completedCampuses: 0 };
    }

    let totalPending = 0;
    let totalCompleted = 0;
    let totalAmount = 0;
    const campusSet = new Set<string>();

    monthRecords.forEach((record) => {
      const branchName = String(record.分校 || "").trim();
      if (branchName) {
        campusSet.add(branchName);
      }
      if (record.完成狀態) {
        totalCompleted++;
        const amountStr = String(record.金額 || "").replace(/,/g, "");
        const amount = parseFloat(amountStr || "0");
        totalAmount += amount;
      } else {
        totalPending++;
      }
    });

    // 計算完成的分校數
    let completedCampuses = 0;
    campusSet.forEach((campusName) => {
      const campusBranch = branches.find((b) => b.分校名稱 === campusName);
      if (campusBranch) {
        const campusData = convertRecordsToData(records, branches, selectedMonth, campusBranch.分校ID);
        if (campusData && campusData.kpi.pendingItems === 0) {
          completedCampuses++;
        }
      }
    });

    return {
      totalPending,
      totalCompleted,
      totalAmount: Math.round(totalAmount),
      completedCampuses,
      totalCampuses: campusSet.size,
    };
  };

  const globalKPI = calculateGlobalKPI();

  // 同步單筆資料到 Google Sheets
  const syncRecordToSheets = async (record: Record) => {
    console.log("📤 準備同步到 Google Sheets", record);

    setSyncStatus("syncing");
    setSyncMessage("同步中...");

    const { success, error } = await saveRecordByJsonp(record);

    if (success) {
      console.log("✅ 資料已同步到 Google Sheets");
      setSyncStatus("success");
      setSyncMessage("已同步");
      // 2 秒後隱藏提示
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 2000);
    } else {
      console.error("❌ 資料同步失敗:", error);
      setSyncStatus("error");
      setSyncMessage("同步失敗");
      // 3 秒後隱藏提示
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 3000);
    }
  };

  // 生成新月份資料
  const generateNewMonth = async () => {
    const newMonth = `${newMonthYear}年${newMonthMonth}月`;

    // 檢查月份是否已存在
    const monthExists = records.some((r) => r.月份 === newMonth);
    if (monthExists) {
      alert("此月份資料已存在");
      return;
    }

    setShowNewMonthDialog(false);
    setIsLoading(true);
    setSyncStatus("syncing");
    setSyncMessage("正在建立月份資料...");

    try {
      // 根據 templates 為所有分校生成資料
      const newRecords: Record[] = [];

      branches.forEach((branch) => {
        const branchTemplates = templates.filter((t) => t.分校 === branch.分校名稱 && t.啟用);

        branchTemplates.forEach((template) => {
          newRecords.push({
            ID: `${newMonth}-${branch.分校ID}-${template.類別}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 5)}`,
            月份: newMonth,
            分校: branch.分校名稱,
            類別: template.類別,
            項目: template.項目,
            完成狀態: false,
            截止日: `${newMonthYear}/${newMonthMonth}/${template.預設截止日}`,
            繳費日期: "",
            金額: template.預設金額 || "",
            備註: template.備註 || "",
            更新時間: new Date().toISOString(),
          });
        });
      });

      console.log(`準備建立 ${newRecords.length} 筆資料`);

      if (newRecords.length === 0) {
        alert("沒有可用的固定支出主檔，請先設定固定支出項目");
        setIsLoading(false);
        setSyncStatus("idle");
        return;
      }

      // 逐筆寫入到 Google Sheets（因為 Apps Script 沒有批次寫入功能）
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < newRecords.length; i++) {
        setSyncMessage(`正在建立月份資料... (${i + 1}/${newRecords.length})`);

        const { success } = await saveRecordByJsonp(newRecords[i]);

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }

        // 每筆之間稍微延遲，避免 API 限流
        if (i < newRecords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (successCount > 0) {
        console.log(`成功寫入 ${successCount} 筆資料，失敗 ${failedCount} 筆`);

        // 更新本地 records
        setRecords([...records, ...newRecords]);

        // 切換到新生成的月份
        setSelectedMonth(newMonth);

        setSyncStatus("success");
        setSyncMessage("月份資料已建立");

        if (failedCount > 0) {
          alert(`建立 ${newMonth} 的固定支出資料：成功 ${successCount} 筆，失敗 ${failedCount} 筆`);
        } else {
          alert(`成功建立 ${newMonth} 的固定支出資料（共 ${successCount} 筆）`);
        }

        setTimeout(() => {
          setSyncStatus("idle");
          setSyncMessage("");
        }, 2000);
      } else {
        console.error("所有寫入均失敗");
        setSyncStatus("error");
        setSyncMessage("建立失敗");
        alert("月份資料建立失敗，所有資料寫入均失敗");

        setTimeout(() => {
          setSyncStatus("idle");
          setSyncMessage("");
        }, 3000);
      }
    } catch (err) {
      console.error("生成月份資料時發生錯誤:", err);
      setSyncStatus("error");
      setSyncMessage("建立失敗");
      alert("月份資料建立失敗，請稍後再試");

      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 3000);
    }

    setIsLoading(false);
  };

  // 重置資料
  const resetData = async () => {
    clearLocalStorage();
    setShowResetDialog(false);

    // 重新載入 API 資料
    setIsLoading(true);
    const { data, error } = await loadDataByJsonp();

    if (data) {
      setApiData(data);
      const filteredBranches = data.branches.filter((b) => b.啟用);
      setBranches(filteredBranches);
      setTemplates(data.templates.filter((t) => t.啟用));

      const convertedRecords = data.records.map((record) => ({
        ...record,
        完成狀態: convertCompletedStatus(record.完成狀態),
      }));
      setRecords(convertedRecords);

      // 同步到 localStorage
      saveToLocalStorage(convertedRecords, "115年6月", filteredBranches[0]?.分校ID || "soar");

      setApiError(false);
      setApiErrorMessage("");
      setSelectedMonth("115年6月");
      setSelectedCampus(filteredBranches[0]?.分校ID || "soar");
      alert("資料已重置為預設值！");
    } else {
      setApiError(true);
      setApiErrorMessage(error || "未知錯誤");
      alert(`重置失敗: ${error || "未知錯誤"}`);
    }

    setIsLoading(false);
  };

  // 匯出本月資料為 CSV
  const exportToCSV = () => {
    const currentBranchName = branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || "";

    // 篩選當前月份和分校的資料
    const exportRecords = records.filter(
      (r) => String(r.月份 || "").trim() === selectedMonth && String(r.分校 || "").trim() === currentBranchName
    );

    if (exportRecords.length === 0) {
      alert("目前沒有可匯出的資料");
      return;
    }

    // CSV 標題列
    const headers = ["月份", "分校", "類別", "項目", "狀態", "截止日", "繳費日期", "金額", "備註"];

    // 組裝資料列
    const rows = exportRecords.map((record) => [
      record.月份,
      record.分校,
      record.類別,
      record.項目,
      record.完成狀態 ? "已完成" : "未完成",
      record.截止日,
      record.繳費日期 || "",
      record.金額,
      record.備註,
    ]);

    // 組合成 CSV 內容
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // 建立下載連結
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const currentCampusName = branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || "";
    link.setAttribute("href", url);
    link.setAttribute("download", `支出資料_${selectedMonth}_${currentCampusName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 更新項目完成狀態
  const toggleItemCompleted = (categoryIndex: number, itemId: string) => {
    console.log("🔄 切換完成狀態 - itemId:", itemId);

    const updatedRecords = records.map((record) => {
      if (record.ID === itemId) {
        return {
          ...record,
          完成狀態: !record.完成狀態,
          更新時間: new Date().toISOString(),
        };
      }
      return record;
    });

    setRecords(updatedRecords);

    // 找到更新的 record 並同步到 Google Sheets
    const updatedRecord = updatedRecords.find((r) => r.ID === itemId);
    if (updatedRecord) {
      console.log("✓ 找到更新的 record，準備同步");
      syncRecordToSheets(updatedRecord);
    } else {
      console.error("✗ 找不到 ID 為", itemId, "的 record");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                逗點教室｜分校每月固定支出控管
              </h1>
              <p className="text-sm text-gray-500 mt-1">七校區・每月繳費追蹤系統</p>
            </div>
            <div className="flex items-center gap-4">
              {/* 同步狀態提示 */}
              {syncStatus !== "idle" && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    syncStatus === "syncing"
                      ? "bg-blue-50 text-blue-700"
                      : syncStatus === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {syncStatus === "syncing" && <CloudUpload className="w-4 h-4 animate-pulse" />}
                  {syncStatus === "success" && <Check className="w-4 h-4" />}
                  {syncStatus === "error" && <AlertCircle className="w-4 h-4" />}
                  <span>{syncMessage}</span>
                </div>
              )}

              {/* 重置資料按鈕 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="text-sm gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
              >
                <RotateCcw className="w-4 h-4" />
                重置資料
              </Button>

              {/* 生成新月份按鈕 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewMonthDialog(true)}
                className="text-sm gap-2"
              >
                <FilePlus2 className="w-4 h-4" />
                生成新月份
              </Button>

              {/* 匯出本月資料按鈕 */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="text-sm gap-2"
              >
                <FileDown className="w-4 h-4" />
                匯出本月資料
              </Button>

              {/* 月份選擇 */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{selectedMonth}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 模式切換 */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "detail" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("detail")}
                  className="text-sm"
                >
                  明細
                </Button>
                <Button
                  variant={viewMode === "overview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("overview")}
                  className="text-sm"
                >
                  總覽
                </Button>
              </div>
            </div>
          </div>

          {/* 分校切換 Tabs */}
          {viewMode === "detail" && !isLoading && !apiError && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {branches.map((branch) => {
                const isCompleted = getCampusCompleted(branch.分校ID);
                return (
                  <button
                    key={branch.分校ID}
                    onClick={() => setSelectedCampus(branch.分校ID)}
                    className={`
                      relative px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                      ${
                        selectedCampus === branch.分校ID
                          ? "bg-gray-900 text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-300 hover:border-gray-400"
                      }
                    `}
                  >
                    {branch.分校名稱}
                    {!isCompleted && selectedCampus !== branch.分校ID && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {isLoading ? (
          <Card className="p-12 bg-white border border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <div className="w-16 h-16 mx-auto border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">載入中...</h3>
              <p className="text-gray-600">正在讀取資料，請稍候</p>
            </div>
          </Card>
        ) : apiError ? (
          <Card className="p-12 bg-white border border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-red-400 mb-4">
                <Circle className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">資料讀取失敗</h3>
              <p className="text-gray-600 mb-2">請稍後再試，或聯繫系統管理員</p>
              {apiErrorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-red-700 font-mono">{apiErrorMessage}</p>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  重新載入
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                API URL: {API_URL}
              </p>
            </div>
          </Card>
        ) : !currentCampusData ? (
          <Card className="p-12 bg-white border border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto" />
              </div>
              {/* 判斷是整個月份沒資料，還是只有當前分校沒資料 */}
              {records.filter((r) => String(r.月份 || "").trim() === selectedMonth).length === 0 ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    此月份尚未建立固定支出資料
                  </h3>
                  <p className="text-gray-600 mb-6">
                    請點擊下方按鈕生成 {selectedMonth} 的固定支出清單
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    此分校本月尚無固定支出資料
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || ""} 在 {selectedMonth} 尚無資料
                  </p>
                </>
              )}
              <Button
                onClick={async () => {
                  setIsLoading(true);
                  setSyncStatus("syncing");
                  setSyncMessage("正在建立月份資料...");

                  try {
                    // 根據 templates 為所有分校生成資料
                    const newRecords: Record[] = [];
                    const [year, month] = selectedMonth.split("年");
                    const monthNum = month.replace("月", "");

                    branches.forEach((branch) => {
                      const branchTemplates = templates.filter(
                        (t) => t.分校 === branch.分校名稱 && t.啟用
                      );

                      branchTemplates.forEach((template) => {
                        newRecords.push({
                          ID: `${selectedMonth}-${branch.分校ID}-${template.類別}-${Date.now()}-${Math.random()
                            .toString(36)
                            .substr(2, 5)}`,
                          月份: selectedMonth,
                          分校: branch.分校名稱,
                          類別: template.類別,
                          項目: template.項目,
                          完成狀態: false,
                          截止日: `${year}/${monthNum}/${template.預設截止日}`,
                          繳費日期: "",
                          金額: template.預設金額 || "",
                          備註: template.備註 || "",
                          更新時間: new Date().toISOString(),
                        });
                      });
                    });

                    if (newRecords.length === 0) {
                      alert("沒有可用的固定支出主檔，請先設定固定支出項目");
                      setIsLoading(false);
                      setSyncStatus("idle");
                      return;
                    }

                    // 逐筆寫入到 Google Sheets
                    let successCount = 0;
                    let failedCount = 0;

                    for (let i = 0; i < newRecords.length; i++) {
                      setSyncMessage(`正在建立月份資料... (${i + 1}/${newRecords.length})`);

                      const { success } = await saveRecordByJsonp(newRecords[i]);

                      if (success) {
                        successCount++;
                      } else {
                        failedCount++;
                      }

                      // 每筆之間稍微延遲，避免 API 限流
                      if (i < newRecords.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                      }
                    }

                    if (successCount > 0) {
                      // 更新本地 records
                      setRecords([...records, ...newRecords]);
                      setSyncStatus("success");
                      setSyncMessage("月份資料已建立");

                      if (failedCount > 0) {
                        alert(`建立 ${selectedMonth} 的固定支出資料：成功 ${successCount} 筆，失敗 ${failedCount} 筆`);
                      } else {
                        alert(`成功建立 ${selectedMonth} 的固定支出資料（共 ${successCount} 筆）`);
                      }

                      setTimeout(() => {
                        setSyncStatus("idle");
                        setSyncMessage("");
                      }, 2000);
                    } else {
                      setSyncStatus("error");
                      setSyncMessage("建立失敗");
                      alert("月份資料建立失敗，所有資料寫入均失敗");

                      setTimeout(() => {
                        setSyncStatus("idle");
                        setSyncMessage("");
                      }, 3000);
                    }
                  } catch (err) {
                    setSyncStatus("error");
                    setSyncMessage("建立失敗");
                    alert("月份資料建立失敗，請稍後再試");

                    setTimeout(() => {
                      setSyncStatus("idle");
                      setSyncMessage("");
                    }, 3000);
                  }

                  setIsLoading(false);
                }}
                className="gap-2"
              >
                <FilePlus2 className="w-4 h-4" />
                生成此月份資料
              </Button>
            </div>
          </Card>
        ) : viewMode === "detail" ? (
          <DetailView
            categories={currentCampusData?.categories || []}
            kpi={currentCampusData?.kpi}
            toggleItemCompleted={toggleItemCompleted}
            records={records}
            setRecords={setRecords}
            selectedMonth={selectedMonth}
            selectedCampus={selectedCampus}
            branches={branches}
            syncRecordToSheets={syncRecordToSheets}
          />
        ) : (
          <OverviewView
            records={records}
            branches={branches}
            selectedMonth={selectedMonth}
          />
        )}
      </div>

      {/* 重置資料確認對話框 */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>重置資料</DialogTitle>
            <DialogDescription>
              確定要清除目前儲存資料並恢復預設資料嗎？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-medium text-red-700 mb-2">⚠️ 警告</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>此操作將清除所有已儲存的資料</li>
                <li>包含所有月份的編輯紀錄</li>
                <li>此操作無法復原</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button
              onClick={resetData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              確認重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生成新月份對話框 */}
      <Dialog open={showNewMonthDialog} onOpenChange={setShowNewMonthDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>生成新月份固定支出</DialogTitle>
            <DialogDescription>
              請選擇要生成的月份，系統將根據固定支出主檔自動建立該月份的支出清單。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>年份</Label>
                <Select value={newMonthYear} onValueChange={setNewMonthYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="114">114年</SelectItem>
                    <SelectItem value="115">115年</SelectItem>
                    <SelectItem value="116">116年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>月份</Label>
                <Select value={newMonthMonth} onValueChange={setNewMonthMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={String(month)}>
                        {month}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-medium mb-1">將自動生成：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>所有分校的固定支出項目</li>
                <li>根據主檔帶入截止日、金額、備註</li>
                <li>狀態預設為「未完成」</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMonthDialog(false)}>
              取消
            </Button>
            <Button onClick={generateNewMonth}>確認生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 明細模式
function DetailView({
  categories,
  kpi,
  toggleItemCompleted,
  records,
  setRecords,
  selectedMonth,
  selectedCampus,
  branches,
  syncRecordToSheets,
}: {
  categories: ExpenseCategory[];
  kpi: any;
  toggleItemCompleted: (categoryIndex: number, itemId: string) => void;
  records: Record[];
  setRecords: React.Dispatch<React.SetStateAction<Record[]>>;
  selectedMonth: string;
  selectedCampus: string;
  branches: Branch[];
  syncRecordToSheets: (record: Record) => Promise<void>;
}) {
  const [editingItem, setEditingItem] = useState<{ categoryIndex: number; itemId: string } | null>(null);
  const [editForm, setEditForm] = useState<ExpenseItem | null>(null);
  const syncTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 獲取當前分校名稱
  const currentBranchName = branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || "";

  // 新增項目
  const addItem = (categoryIndex: number) => {
    console.log("➕ 新增項目 - 類別:", categories[categoryIndex].category);

    const category = categories[categoryIndex];
    const newRecord: Record = {
      ID: `${selectedMonth}-${selectedCampus}-${Date.now()}`,
      月份: selectedMonth,
      分校: currentBranchName,
      類別: category.category,
      項目: "新項目",
      完成狀態: false,
      截止日: "",
      繳費日期: "",
      金額: "",
      備註: "",
      更新時間: new Date().toISOString(),
    };

    setRecords([...records, newRecord]);
    setEditingItem({ categoryIndex, itemId: newRecord.ID });
    setEditForm({
      id: newRecord.ID,
      name: "新項目",
      deadline: "",
      amount: "",
      note: "",
      paymentDate: "",
      completed: false,
      status: "未完成",
    });

    // 立即同步新增的空項目到 Google Sheets
    console.log("✓ 新項目已建立，立即同步到 Google Sheets");
    syncRecordToSheets(newRecord);
  };

  // 刪除項目
  const deleteItem = async (categoryIndex: number, itemId: string) => {
    console.log("🗑️ 刪除項目 - itemId:", itemId);

    // 找到要刪除的 record
    const recordToDelete = records.find((r) => r.ID === itemId);

    if (!recordToDelete) {
      console.error("✗ 找不到要刪除的 record");
      return;
    }

    // 從畫面移除
    setRecords(records.filter((r) => r.ID !== itemId));

    // 同步到 Google Sheets（標記為刪除）
    const deletedRecord = {
      ...recordToDelete,
      項目: "[已刪除]" + recordToDelete.項目,
      更新時間: new Date().toISOString(),
    };

    console.log("✓ 標記為刪除，準備同步");
    await syncRecordToSheets(deletedRecord);
  };

  // 開始編輯
  const startEdit = (categoryIndex: number, item: ExpenseItem) => {
    setEditingItem({ categoryIndex, itemId: item.id });
    setEditForm({ ...item });
  };

  // 儲存編輯
  const saveEdit = async (categoryIndex: number, itemId: string) => {
    if (!editForm) return;

    console.log("💾 儲存編輯 - itemId:", itemId, "editForm:", editForm);

    const updatedRecords = records.map((record) => {
      if (record.ID === itemId) {
        return {
          ...record,
          項目: editForm.name,
          截止日: editForm.deadline,
          金額: editForm.amount,
          備註: editForm.note,
          更新時間: new Date().toISOString(),
        };
      }
      return record;
    });

    setRecords(updatedRecords);
    setEditingItem(null);
    setEditForm(null);

    // 同步到 Google Sheets
    const updatedRecord = updatedRecords.find((r) => r.ID === itemId);
    if (updatedRecord) {
      console.log("✓ 找到更新的 record，準備同步");
      await syncRecordToSheets(updatedRecord);
    } else {
      console.error("✗ 找不到 ID 為", itemId, "的 record");
    }
  };

  // 取消編輯
  const cancelEdit = (categoryIndex: number, itemId: string) => {
    const item = categories[categoryIndex].items.find((i) => i.id === itemId);
    if (item && !item.name) {
      deleteItem(categoryIndex, itemId);
    }
    setEditingItem(null);
    setEditForm(null);
  };

  // 更新項目欄位值（非編輯模式）
  const updateItemField = (
    categoryIndex: number,
    itemId: string,
    field: keyof ExpenseItem,
    value: string
  ) => {
    console.log("✏️ 更新欄位 - itemId:", itemId, "field:", field, "value:", value);

    const fieldMapping: { [key: string]: string } = {
      paymentDate: "繳費日期",
      amount: "金額",
      note: "備註",
    };

    const chineseField = fieldMapping[field] || field;
    console.log("   中文欄位名稱:", chineseField);

    const updatedRecords = records.map((record) => {
      if (record.ID === itemId) {
        return {
          ...record,
          [chineseField]: value,
          更新時間: new Date().toISOString(),
        };
      }
      return record;
    });

    setRecords(updatedRecords);

    // 使用 debounce 避免頻繁同步
    if (syncTimeoutRef.current[itemId]) {
      console.log("   清除之前的 timeout");
      clearTimeout(syncTimeoutRef.current[itemId]);
    }

    console.log("   設定 1 秒後同步");
    syncTimeoutRef.current[itemId] = setTimeout(() => {
      const updatedRecord = updatedRecords.find((r) => r.ID === itemId);
      if (updatedRecord) {
        console.log("⏰ Timeout 觸發，準備同步");
        syncRecordToSheets(updatedRecord);
      } else {
        console.error("✗ Timeout 觸發但找不到 record");
      }
      delete syncTimeoutRef.current[itemId];
    }, 1000);
  };

  const isEditing = (categoryIndex: number, itemId: string) => {
    return editingItem?.categoryIndex === categoryIndex && editingItem?.itemId === itemId;
  };

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">本分校未完成</div>
          <div className="text-3xl font-semibold text-gray-900">{kpi?.pendingItems || 0}項</div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">已完成金額</div>
          <div className="text-3xl font-semibold text-gray-900">
            ${(kpi?.completedAmount || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">本分校已輸入金額</div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">完成率</div>
          <div className="text-3xl font-semibold text-gray-900">
            {kpi?.totalItems ? Math.round((kpi.completedItems / kpi.totalItems) * 100) : 0}%
          </div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">已完成/總項目</div>
          <div className="text-3xl font-semibold text-gray-900">
            {kpi?.completedItems || 0}/{kpi?.totalItems || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">本分校統計</div>
        </Card>
      </div>

      {/* Expense Table */}
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[120px]">
                  類別
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[200px]">
                  項目
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[100px]">
                  狀態
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[140px]">
                  截止日
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[140px]">
                  繳費日期
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[150px]">
                  金額（元）
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  備註
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[120px]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, categoryIndex) => (
                <React.Fragment key={`category-${categoryIndex}`}>
                  {/* Category Header */}
                  <tr className={category.color}>
                    <td
                      colSpan={7}
                      className="px-6 py-3 text-sm font-semibold text-gray-700"
                    >
                      {category.category}
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addItem(categoryIndex)}
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        新增項目
                      </Button>
                    </td>
                  </tr>

                  {/* Items */}
                  {category.items.map((item) => {
                    const editing = isEditing(categoryIndex, item.id);
                    const currentData = editing && editForm ? editForm : item;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4">
                          {editing ? (
                            <Input
                              value={currentData.name}
                              onChange={(e) =>
                                setEditForm({ ...currentData, name: e.target.value })
                              }
                              placeholder="項目名稱"
                              className="text-sm h-9"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{item.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleItemCompleted(categoryIndex, item.id)}
                            className="hover:scale-110 transition-transform"
                            title={item.completed ? "點擊標記為未完成" : "點擊標記為已完成"}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {editing ? (
                            <Input
                              value={currentData.deadline}
                              onChange={(e) =>
                                setEditForm({ ...currentData, deadline: e.target.value })
                              }
                              placeholder="115/5/10"
                              className="text-sm h-9"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {item.deadline}
                              <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.paymentDate || ""}
                              onChange={(e) =>
                                updateItemField(categoryIndex, item.id, "paymentDate", e.target.value)
                              }
                              placeholder="年/月/日"
                              className="text-sm h-9"
                              disabled={editing}
                            />
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editing ? (
                            <Input
                              value={currentData.amount}
                              onChange={(e) =>
                                setEditForm({ ...currentData, amount: e.target.value })
                              }
                              placeholder="輸入金額"
                              className="text-sm h-9"
                            />
                          ) : (
                            <Input
                              value={item.amount}
                              onChange={(e) =>
                                updateItemField(categoryIndex, item.id, "amount", e.target.value)
                              }
                              placeholder="輸入金額"
                              className={`text-sm h-9 ${
                                item.amount ? "text-blue-600 font-medium" : ""
                              }`}
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editing ? (
                            <Input
                              value={currentData.note}
                              onChange={(e) =>
                                setEditForm({ ...currentData, note: e.target.value })
                              }
                              placeholder="備註"
                              className="text-sm h-9"
                            />
                          ) : (
                            <Input
                              value={item.note}
                              onChange={(e) =>
                                updateItemField(categoryIndex, item.id, "note", e.target.value)
                              }
                              placeholder="備註"
                              className="text-sm h-9 text-gray-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {editing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => saveEdit(categoryIndex, item.id)}
                                  className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  儲存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelEdit(categoryIndex, item.id)}
                                  className="h-7 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                >
                                  取消
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(categoryIndex, item)}
                                  className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteItem(categoryIndex, item.id)}
                                  className="h-7 w-7 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// 總覽模式
function OverviewView({
  records,
  branches,
  selectedMonth,
}: {
  records: Record[];
  branches: Branch[];
  selectedMonth: string;
}) {
  // 轉換函數
  const convertRecordsToDataForOverview = (
    records: Record[],
    branches: Branch[],
    selectedMonth: string,
    selectedCampus: string
  ) => {
    // 將分校 ID 轉換為分校名稱
    const currentBranchName = branches.find((b) => b.分校ID === selectedCampus)?.分校名稱 || "";

    const filteredRecords = records.filter(
      (r) => String(r.月份 || "").trim() === selectedMonth && String(r.分校 || "").trim() === currentBranchName
    );

    if (filteredRecords.length === 0) {
      return null;
    }

    const categoriesMap = new Map<string, ExpenseItem[]>();

    filteredRecords.forEach((record) => {
      const category = record.類別;
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }

      categoriesMap.get(category)!.push({
        id: record.ID,
        name: record.項目,
        deadline: record.截止日,
        amount: record.金額 || "",
        note: record.備註 || "",
        paymentDate: record.繳費日期 || "",
        completed: record.完成狀態,
        status: record.完成狀態 ? "已完成" : "未完成",
      });
    });

    const categories: ExpenseCategory[] = Array.from(categoriesMap.entries()).map(
      ([categoryName, items]) => ({
        category: categoryName,
        color: "bg-blue-50",
        items,
      })
    );

    const allItems = categories.flatMap((cat) => cat.items);
    const completedItems = allItems.filter((item) => item.completed).length;
    const pendingItems = allItems.length - completedItems;
    const completedAmount = allItems
      .filter((item) => item.completed && item.amount)
      .reduce((sum, item) => {
        const amountStr = String(item.amount || "").replace(/,/g, "");
        return sum + parseFloat(amountStr || "0");
      }, 0);

    return {
      categories,
      kpi: {
        totalItems: allItems.length,
        completedItems,
        pendingItems,
        completedAmount: Math.round(completedAmount),
      },
    };
  };

  // 計算總計
  const totalStats = {
    totalItems: 0,
    completedItems: 0,
    totalAmount: 0,
  };

  branches.forEach((branch) => {
    const campusData = convertRecordsToDataForOverview(
      records,
      branches,
      selectedMonth,
      branch.分校ID
    );
    if (campusData) {
      totalStats.totalItems += campusData.kpi.totalItems;
      totalStats.completedItems += campusData.kpi.completedItems;
      totalStats.totalAmount += campusData.kpi.completedAmount;
    }
  });

  return (
    <Card className="bg-white border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[180px]">
                分校
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[140px]">
                應處理項目
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[140px]">
                已完成項目
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[140px]">
                未完成項目
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-[200px]">
                完成率
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                已完成金額
              </th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const campusData = convertRecordsToDataForOverview(
                records,
                branches,
                selectedMonth,
                branch.分校ID
              );
              const rate =
                campusData && campusData.kpi.totalItems > 0
                  ? Math.round((campusData.kpi.completedItems / campusData.kpi.totalItems) * 100)
                  : 0;

              return (
                <tr
                  key={branch.分校ID}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-gray-900">
                      {branch.分校名稱}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-900">
                      {campusData ? campusData.kpi.totalItems : 0}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-green-600 font-medium">
                      {campusData ? campusData.kpi.completedItems : 0}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-900">
                      {campusData ? campusData.kpi.pendingItems : 0}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-[45px]">
                        {rate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-gray-900">
                      ${campusData ? campusData.kpi.completedAmount.toLocaleString() : 0}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-5 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">總計</div>
          <div className="flex gap-12">
            <div className="text-right">
              <div className="text-xs text-gray-500">已完成</div>
              <div className="text-lg font-semibold text-gray-900">
                {totalStats.completedItems}/{totalStats.totalItems}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">總已完成金額</div>
              <div className="text-lg font-semibold text-gray-900">
                ${totalStats.totalAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
