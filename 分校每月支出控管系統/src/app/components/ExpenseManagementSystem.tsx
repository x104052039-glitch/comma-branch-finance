import React, { useState } from "react";
import { Calendar, ChevronDown, CheckCircle2, Circle, Plus, Edit2, Trash2 } from "lucide-react";
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

// 分校列表
const campuses = [
  { id: "soar", name: "翱翔校", completed: true },
  { id: "wings", name: "展翅校", completed: true },
  { id: "dawn", name: "晨光校", completed: true },
  { id: "aurora", name: "極光校", completed: false },
  { id: "forest", name: "森耀校", completed: false },
  { id: "cloud", name: "騰雲校", completed: false },
  { id: "wisdom", name: "知行校", completed: false },
];

// 支出項目資料型別
interface ExpenseItem {
  id: string;
  name: string;
  deadline: string;
  amount: string;
  note: string;
  paymentDate?: string;
}

interface ExpenseCategory {
  category: string;
  color: string;
  items: ExpenseItem[];
}

// 支出項目類別初始資料
const initialExpenseCategories: ExpenseCategory[] = [
  {
    category: "環境",
    color: "bg-blue-50",
    items: [{ id: "env-1", name: "芳香劑", deadline: "115/5/10", amount: "", note: "每月20號繳納後上ERP" }],
  },
  {
    category: "水電費",
    color: "bg-blue-50",
    items: [
      { id: "utility-1", name: "1樓水費", deadline: "115/5/15", amount: "1,200", note: "" },
      { id: "utility-2", name: "2樓水費", deadline: "115/5/15", amount: "1,500", note: "" },
      { id: "utility-3", name: "3樓水費", deadline: "115/5/15", amount: "1,800", note: "" },
      { id: "utility-4", name: "樹屋水費", deadline: "115/5/15", amount: "", note: "" },
      { id: "utility-5", name: "1樓電費", deadline: "115/5/20", amount: "8,500", note: "" },
      { id: "utility-6", name: "2樓電費", deadline: "115/5/20", amount: "9,200", note: "" },
      { id: "utility-7", name: "3樓電費", deadline: "115/5/20", amount: "7,800", note: "" },
    ],
  },
  {
    category: "電信費",
    color: "bg-blue-50",
    items: [
      { id: "tel-1", name: "中華電信網路費", deadline: "115/5/5", amount: "2,500", note: "3/31上ERP（繳費期限4/7）" },
      { id: "tel-2", name: "中華電信電話費", deadline: "115/5/5", amount: "1,200", note: "" },
      { id: "tel-3", name: "毅通網路電話費", deadline: "115/5/8", amount: "3,800", note: "10-12月、1-3月費用；4/14上ERP" },
    ],
  },
  {
    category: "影印費",
    color: "bg-blue-50",
    items: [{ id: "copy-1", name: "影印機費用", deadline: "115/5/25", amount: "4,500", note: "點擊新增..." }],
  },
  {
    category: "房租",
    color: "bg-blue-50",
    items: [
      { id: "rent-1", name: "每月房租（265號）", deadline: "115/5/1", amount: "70,000", note: "最後繳費1/30，繳到12月；每月1..." },
      { id: "rent-2", name: "每月樹屋房租（235號）", deadline: "115/5/1", amount: "15,000", note: "區間12/03-01/27；單數月收" },
    ],
  },
  {
    category: "勞工相關",
    color: "bg-blue-50",
    items: [
      { id: "labor-1", name: "勞保費", deadline: "115/5/30", amount: "28,500", note: "區間10/03-12/02（已繳）" },
      { id: "labor-2", name: "健保費", deadline: "115/5/30", amount: "18,200", note: "" },
      { id: "labor-3", name: "勞退費", deadline: "115/5/30", amount: "12,800", note: "已繳2025/8-2026/7" },
    ],
  },
];

// 總覽模式的分校數據
const overviewData = [
  { campus: "翱翔校", total: 22, completed: 18, pending: 4, rate: 82, amount: 85000 },
  { campus: "展翅校", total: 22, completed: 19, pending: 3, rate: 86, amount: 92000 },
  { campus: "晨光校", total: 22, completed: 20, pending: 2, rate: 91, amount: 88000 },
  { campus: "極光校", total: 22, completed: 3, pending: 19, rate: 14, amount: 45000 },
  { campus: "森耀校", total: 22, completed: 4, pending: 18, rate: 18, amount: 52000 },
  { campus: "騰雲校", total: 22, completed: 2, pending: 20, rate: 9, amount: 38000 },
  { campus: "知行校", total: 22, completed: 5, pending: 17, rate: 23, amount: 58000 },
];

export function ExpenseManagementSystem() {
  const [selectedCampus, setSelectedCampus] = useState("soar");
  const [viewMode, setViewMode] = useState<"detail" | "overview">("detail");
  const [selectedMonth, setSelectedMonth] = useState("115/5");
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(initialExpenseCategories);

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
              {/* 月份選擇 */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="115/3">115年3月</SelectItem>
                  <SelectItem value="115/4">115年4月</SelectItem>
                  <SelectItem value="115/5">115年5月</SelectItem>
                  <SelectItem value="115/6">115年6月</SelectItem>
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
          {viewMode === "detail" && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {campuses.map((campus) => (
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
                  {!campus.completed && selectedCampus !== campus.id && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {viewMode === "detail" ? (
          <DetailView
            expenseCategories={expenseCategories}
            setExpenseCategories={setExpenseCategories}
          />
        ) : (
          <OverviewView />
        )}
      </div>
    </div>
  );
}

// 明細模式
function DetailView({
  expenseCategories,
  setExpenseCategories,
}: {
  expenseCategories: ExpenseCategory[];
  setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
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
    };

    const updatedCategories = [...expenseCategories];
    updatedCategories[categoryIndex].items.push(newItem);
    setExpenseCategories(updatedCategories);
    setEditingItem({ categoryIndex, itemId: newItem.id });
    setEditForm(newItem);
  };

  // 刪除項目
  const deleteItem = (categoryIndex: number, itemId: string) => {
    const updatedCategories = [...expenseCategories];
    updatedCategories[categoryIndex].items = updatedCategories[categoryIndex].items.filter(
      (item) => item.id !== itemId
    );
    setExpenseCategories(updatedCategories);
  };

  // 開始編輯
  const startEdit = (categoryIndex: number, item: ExpenseItem) => {
    setEditingItem({ categoryIndex, itemId: item.id });
    setEditForm({ ...item, paymentDate: item.paymentDate || "" });
  };

  // 儲存編輯
  const saveEdit = (categoryIndex: number, itemId: string) => {
    if (!editForm) return;

    const updatedCategories = [...expenseCategories];
    const itemIndex = updatedCategories[categoryIndex].items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      updatedCategories[categoryIndex].items[itemIndex] = editForm;
    }
    setExpenseCategories(updatedCategories);
    setEditingItem(null);
    setEditForm(null);
  };

  // 取消編輯
  const cancelEdit = (categoryIndex: number, itemId: string) => {
    // 如果是新增的項目（名稱為空），取消時刪除
    const item = expenseCategories[categoryIndex].items.find((i) => i.id === itemId);
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
    const updatedCategories = [...expenseCategories];
    const itemIndex = updatedCategories[categoryIndex].items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      updatedCategories[categoryIndex].items[itemIndex] = {
        ...updatedCategories[categoryIndex].items[itemIndex],
        [field]: value,
      };
      setExpenseCategories(updatedCategories);
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
          <div className="text-sm text-gray-600 mb-2">全校區未繳</div>
          <div className="text-3xl font-semibold text-gray-900">65項</div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">已繳金額合計</div>
          <div className="text-3xl font-semibold text-gray-900">$576,217</div>
          <div className="text-xs text-gray-500 mt-1">本月已輸入金額</div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">完成率</div>
          <div className="text-3xl font-semibold text-gray-900">17%</div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <div className="text-sm text-gray-600 mb-2">已繳分校</div>
          <div className="text-3xl font-semibold text-gray-900">3/7</div>
          <div className="text-xs text-gray-500 mt-1">已繳 $85,000</div>
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
              {expenseCategories.map((category, categoryIndex) => (
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
                          {item.amount ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
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
function OverviewView() {
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
                已繳金額
              </th>
            </tr>
          </thead>
          <tbody>
            {overviewData.map((data, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-6 py-5">
                  <div className="text-sm font-medium text-gray-900">
                    {data.campus}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm text-gray-900">{data.total}</div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm text-green-600 font-medium">
                    {data.completed}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm text-gray-900">{data.pending}</div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${data.rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[45px]">
                      {data.rate}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm font-medium text-gray-900">
                    ${data.amount.toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
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
              <div className="text-lg font-semibold text-gray-900">71/154</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">總已繳金額</div>
              <div className="text-lg font-semibold text-gray-900">
                $458,000
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
