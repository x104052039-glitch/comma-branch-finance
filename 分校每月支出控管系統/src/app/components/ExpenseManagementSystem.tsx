import React, { useState } from "react";
import { Calendar, ChevronDown, CheckCircle2, Circle, Plus, Edit2, Trash2, FileDown, FilePlus2 } from "lucide-react";
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


// 支出項目資料型別
interface ExpenseItem {
  id: string;
  name: string;
  deadline: string;
  amount: string;
  note: string;
  paymentDate?: string;
  completed: boolean; // 完成狀態
  status: "已完成" | "未完成";
}

interface ExpenseCategory {
  category: string;
  color: string;
  items: ExpenseItem[];
}

// 分校資料型別
interface CampusData {
  id: string;
  name: string;
  completed: boolean;
}

// 月份資料型別
interface MonthData {
  campuses: {
    [campusId: string]: {
      categories: ExpenseCategory[];
      kpi: {
        totalItems: number;
        completedItems: number;
        pendingItems: number;
        completedAmount: number;
      };
    };
  };
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
const monthlyData: { [key: string]: MonthData } = {
  "115年3月": generateMonthData("115", "3"),
  "115年4月": generateMonthData("115", "4"),
  "115年5月": generateMonthData("115", "5"),
  "115年6月": generateMonthData("115", "6"),
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
  const [selectedCampus, setSelectedCampus] = useState("soar");
  const [viewMode, setViewMode] = useState<"detail" | "overview">("detail");
  const [selectedMonth, setSelectedMonth] = useState("115年6月");
  const [allMonthlyData, setAllMonthlyData] = useState(monthlyData);
  const [showNewMonthDialog, setShowNewMonthDialog] = useState(false);
  const [newMonthYear, setNewMonthYear] = useState("115");
  const [newMonthMonth, setNewMonthMonth] = useState("7");

  // 獲取可用月份列表
  const availableMonths = Object.keys(allMonthlyData).sort();

  // 獲取當前月份資料
  const currentMonthData = allMonthlyData[selectedMonth];
  const currentCampusData = currentMonthData?.campuses[selectedCampus];

  // 計算分校完成狀態（用於紅點顯示）
  const getCampusCompleted = (campusId: string) => {
    if (!currentMonthData) return false;
    const campusData = currentMonthData.campuses[campusId];
    return campusData.kpi.pendingItems === 0;
  };

  // 計算全校區統計
  const calculateGlobalKPI = () => {
    if (!currentMonthData) return { totalPending: 0, totalCompleted: 0, totalAmount: 0, completedCampuses: 0 };

    let totalPending = 0;
    let totalCompleted = 0;
    let totalAmount = 0;
    let completedCampuses = 0;

    Object.values(currentMonthData.campuses).forEach((campus) => {
      totalPending += campus.kpi.pendingItems;
      totalCompleted += campus.kpi.completedItems;
      totalAmount += campus.kpi.completedAmount;
      if (campus.kpi.pendingItems === 0) completedCampuses++;
    });

    return { totalPending, totalCompleted, totalAmount, completedCampuses };
  };

  const globalKPI = calculateGlobalKPI();

  // 生成新月份資料
  const generateNewMonth = () => {
    const newMonth = `${newMonthYear}年${newMonthMonth}月`;

    // 檢查月份是否已存在
    if (availableMonths.includes(newMonth)) {
      alert("此月份已存在！");
      return;
    }

    // 生成新月份資料
    const newData = generateMonthData(newMonthYear, newMonthMonth);
    setAllMonthlyData({ ...allMonthlyData, [newMonth]: newData });
    setSelectedMonth(newMonth);
    setShowNewMonthDialog(false);
    alert(`已成功生成 ${newMonth} 的固定支出清單！`);
  };

  // 匯出本月資料為 CSV
  const exportToCSV = () => {
    if (!currentCampusData) {
      alert("目前沒有可匯出的資料");
      return;
    }

    // CSV 標題列
    const headers = ["月份", "分校", "類別", "項目", "狀態", "截止日", "繳費日期", "金額", "備註"];

    // 獲取當前分校名稱
    const currentCampusName = campusList.find((c) => c.id === selectedCampus)?.name || "";

    // 組裝資料列
    const rows = currentCampusData.categories.flatMap((category) =>
      category.items.map((item) => [
        selectedMonth,
        currentCampusName,
        category.category,
        item.name,
        item.status,
        item.deadline,
        item.paymentDate || "",
        item.amount,
        item.note,
      ])
    );

    // 組合成 CSV 內容
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // 建立下載連結
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `支出資料_${selectedMonth}_${currentCampusName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 更新項目完成狀態
  const toggleItemCompleted = (categoryIndex: number, itemId: string) => {
    if (!currentMonthData) return;

    const updatedMonthData = { ...allMonthlyData };
    const categories = updatedMonthData[selectedMonth].campuses[selectedCampus].categories;
    const category = categories[categoryIndex];
    const itemIndex = category.items.findIndex((item) => item.id === itemId);

    if (itemIndex !== -1) {
      const item = category.items[itemIndex];
      item.completed = !item.completed;
      item.status = item.completed ? "已完成" : "未完成";

      // 重新計算 KPI
      const allItems = categories.flatMap((cat) => cat.items);
      const completedItems = allItems.filter((item) => item.completed).length;
      const pendingItems = allItems.length - completedItems;
      const completedAmount = allItems
        .filter((item) => item.completed && item.amount)
        .reduce((sum, item) => sum + parseFloat(item.amount.replace(/,/g, "") || "0"), 0);

      updatedMonthData[selectedMonth].campuses[selectedCampus].kpi = {
        totalItems: allItems.length,
        completedItems,
        pendingItems,
        completedAmount: Math.round(completedAmount),
      };

      setAllMonthlyData(updatedMonthData);
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
          {viewMode === "detail" && currentMonthData && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {campusList.map((campus) => {
                const isCompleted = getCampusCompleted(campus.id);
                return (
                  <button
                    key={campus.id}
                    onClick={() => setSelectedCampus(campus.id)}
                    className={`
                      relative px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                      ${
                        selectedCampus === campus.id
                          ? "bg-gray-900 text-white shadow-sm"
                          : "bg-white text-gray-600 border border-gray-300 hover:border-gray-400"
                      }
                    `}
                  >
                    {campus.name}
                    {!isCompleted && selectedCampus !== campus.id && (
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
        {!currentMonthData ? (
          <Card className="p-12 bg-white border border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                此月份尚未建立固定支出資料
              </h3>
              <p className="text-gray-600 mb-6">
                請點擊下方按鈕生成 {selectedMonth} 的固定支出清單
              </p>
              <Button
                onClick={() => setShowNewMonthDialog(true)}
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
            setAllMonthlyData={setAllMonthlyData}
            allMonthlyData={allMonthlyData}
            selectedMonth={selectedMonth}
            selectedCampus={selectedCampus}
          />
        ) : (
          <OverviewView
            monthData={currentMonthData}
            campusList={campusList}
          />
        )}
      </div>

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
  setAllMonthlyData,
  allMonthlyData,
  selectedMonth,
  selectedCampus,
}: {
  categories: ExpenseCategory[];
  kpi: any;
  toggleItemCompleted: (categoryIndex: number, itemId: string) => void;
  setAllMonthlyData: React.Dispatch<React.SetStateAction<{ [key: string]: MonthData }>>;
  allMonthlyData: { [key: string]: MonthData };
  selectedMonth: string;
  selectedCampus: string;
}) {
  const [editingItem, setEditingItem] = useState<{ categoryIndex: number; itemId: string } | null>(null);
  const [editForm, setEditForm] = useState<ExpenseItem | null>(null);

  // 新增項目
  const addItem = (categoryIndex: number) => {
    const newItem: ExpenseItem = {
      id: `item-${Date.now()}`,
      name: "",
      deadline: "",
      amount: "",
      note: "",
      paymentDate: "",
      completed: false,
      status: "未完成",
    };

    const updatedData = { ...allMonthlyData };
    updatedData[selectedMonth].campuses[selectedCampus].categories[categoryIndex].items.push(newItem);
    setAllMonthlyData(updatedData);
    setEditingItem({ categoryIndex, itemId: newItem.id });
    setEditForm(newItem);
  };

  // 刪除項目
  const deleteItem = (categoryIndex: number, itemId: string) => {
    const updatedData = { ...allMonthlyData };
    const category = updatedData[selectedMonth].campuses[selectedCampus].categories[categoryIndex];
    category.items = category.items.filter((item) => item.id !== itemId);
    setAllMonthlyData(updatedData);
  };

  // 開始編輯
  const startEdit = (categoryIndex: number, item: ExpenseItem) => {
    setEditingItem({ categoryIndex, itemId: item.id });
    setEditForm({ ...item });
  };

  // 儲存編輯
  const saveEdit = (categoryIndex: number, itemId: string) => {
    if (!editForm) return;

    const updatedData = { ...allMonthlyData };
    const items = updatedData[selectedMonth].campuses[selectedCampus].categories[categoryIndex].items;
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      items[itemIndex] = editForm;
    }
    setAllMonthlyData(updatedData);
    setEditingItem(null);
    setEditForm(null);
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
    const updatedData = { ...allMonthlyData };
    const items = updatedData[selectedMonth].campuses[selectedCampus].categories[categoryIndex].items;
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      items[itemIndex] = {
        ...items[itemIndex],
        [field]: value,
      };
      setAllMonthlyData(updatedData);
    }
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
  monthData,
  campusList,
}: {
  monthData: MonthData;
  campusList: Array<{ id: string; name: string }>;
}) {
  // 計算總計
  const totalStats = {
    totalItems: 0,
    completedItems: 0,
    totalAmount: 0,
  };

  Object.values(monthData.campuses).forEach((campus) => {
    totalStats.totalItems += campus.kpi.totalItems;
    totalStats.completedItems += campus.kpi.completedItems;
    totalStats.totalAmount += campus.kpi.completedAmount;
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
            {campusList.map((campus) => {
              const campusData = monthData.campuses[campus.id];
              const rate =
                campusData.kpi.totalItems > 0
                  ? Math.round((campusData.kpi.completedItems / campusData.kpi.totalItems) * 100)
                  : 0;

              return (
                <tr
                  key={campus.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-gray-900">
                      {campus.name}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-900">{campusData.kpi.totalItems}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-green-600 font-medium">
                      {campusData.kpi.completedItems}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-gray-900">{campusData.kpi.pendingItems}</div>
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
                      ${campusData.kpi.completedAmount.toLocaleString()}
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
