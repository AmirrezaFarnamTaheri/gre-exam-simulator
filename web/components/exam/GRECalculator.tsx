"use client";

import React, { useState } from "react";

interface GRECalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferDisplay?: (val: string) => void;
}

export default function GRECalculator({
  isOpen,
  onClose,
  onTransferDisplay,
}: GRECalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState<number | null>(null);
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewInput, setWaitingForNewInput] = useState(false);

  if (!isOpen) return null;

  function handleDigit(d: string) {
    if (waitingForNewInput || display === "0" || display === "ERROR") {
      setDisplay(d);
      setWaitingForNewInput(false);
    } else {
      if (display.length < 8) {
        setDisplay(display + d);
      }
    }
  }

  function handleDecimal() {
    if (waitingForNewInput || display === "ERROR") {
      setDisplay("0.");
      setWaitingForNewInput(false);
    } else if (!display.includes(".")) {
      if (display.length < 8) {
        setDisplay(display + ".");
      }
    }
  }

  function handleSign() {
    if (display === "0" || display === "ERROR") return;
    if (display.startsWith("-")) {
      setDisplay(display.slice(1));
    } else {
      setDisplay("-" + display);
    }
  }

  function handleSqrt() {
    const val = parseFloat(display);
    if (val < 0) {
      setDisplay("ERROR");
      return;
    }
    const res = Math.sqrt(val);
    formatAndSetResult(res);
  }

  function formatAndSetResult(num: number) {
    if (isNaN(num) || !isFinite(num)) {
      setDisplay("ERROR");
      return;
    }
    let s = num.toString();
    if (s.length > 8) {
      s = num.toPrecision(7);
      if (s.length > 8) {
        s = parseFloat(s).toExponential(2);
      }
    }
    if (parseFloat(s) > 99999999 || parseFloat(s) < -9999999) {
      setDisplay("ERROR");
    } else {
      setDisplay(s.slice(0, 8));
    }
    setWaitingForNewInput(true);
  }

  function handleOp(op: string) {
    const current = parseFloat(display);
    if (prevVal !== null && operation && !waitingForNewInput) {
      let res = prevVal;
      if (operation === "+") res = prevVal + current;
      if (operation === "-") res = prevVal - current;
      if (operation === "*") res = prevVal * current;
      if (operation === "/") res = current !== 0 ? prevVal / current : NaN;
      formatAndSetResult(res);
      setPrevVal(res);
    } else {
      setPrevVal(current);
    }
    setOperation(op);
    setWaitingForNewInput(true);
  }

  function handleEquals() {
    if (prevVal === null || !operation) return;
    const current = parseFloat(display);
    let res = prevVal;
    if (operation === "+") res = prevVal + current;
    if (operation === "-") res = prevVal - current;
    if (operation === "*") res = prevVal * current;
    if (operation === "/") res = current !== 0 ? prevVal / current : NaN;

    formatAndSetResult(res);
    setPrevVal(null);
    setOperation(null);
  }

  function handleClear() {
    setDisplay("0");
    setPrevVal(null);
    setOperation(null);
    setWaitingForNewInput(false);
  }

  function handleClearEntry() {
    setDisplay("0");
    setWaitingForNewInput(false);
  }

  function handleMemoryAdd() {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setMemory((memory || 0) + val);
    }
  }

  function handleMemoryRecall() {
    if (memory !== null) {
      setDisplay(memory.toString().slice(0, 8));
      setWaitingForNewInput(true);
    }
  }

  function handleMemoryClear() {
    setMemory(null);
  }

  function handleTransfer() {
    if (onTransferDisplay && display !== "ERROR") {
      onTransferDisplay(display);
    }
  }

  return (
    <div className="fixed top-16 right-6 z-50 bg-[#e8e8e8] border-2 border-[#555] rounded-md shadow-2xl p-3 w-[260px] font-mono select-none">
      <div className="flex justify-between items-center bg-[#1a3a60] text-white px-2 py-1 mb-2 rounded text-xs font-bold">
        <span>GRE CALCULATOR</span>
        <button
          onClick={onClose}
          className="text-white hover:text-red-300 px-1 font-extrabold"
        >
          ✕
        </button>
      </div>

      <div className="bg-[#f4f7f2] border-2 border-inner border-gray-500 rounded p-2 mb-3 text-right text-xl font-bold tracking-widest text-[#222] min-h-[44px] flex items-center justify-between">
        <span className="text-xs text-blue-700 font-semibold">
          {memory !== null ? "M" : ""}
        </span>
        <span className="truncate">{display}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold mb-2">
        <button
          onClick={handleMemoryRecall}
          className="bg-[#d0d0d0] hover:bg-[#c0c0c0] border border-gray-400 py-1.5 rounded active:scale-95"
        >
          MR
        </button>
        <button
          onClick={handleMemoryClear}
          className="bg-[#d0d0d0] hover:bg-[#c0c0c0] border border-gray-400 py-1.5 rounded active:scale-95"
        >
          MC
        </button>
        <button
          onClick={handleMemoryAdd}
          className="bg-[#d0d0d0] hover:bg-[#c0c0c0] border border-gray-400 py-1.5 rounded active:scale-95"
        >
          M+
        </button>
        <button
          onClick={handleClear}
          className="bg-[#e6a29a] hover:bg-[#d88f87] text-black border border-gray-400 py-1.5 rounded active:scale-95"
        >
          C
        </button>

        <button
          onClick={() => handleDigit("7")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          7
        </button>
        <button
          onClick={() => handleDigit("8")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          8
        </button>
        <button
          onClick={() => handleDigit("9")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          9
        </button>
        <button
          onClick={() => handleOp("/")}
          className="bg-[#d9e2ec] hover:bg-[#c4d2e3] border border-gray-400 py-2 rounded active:scale-95 font-bold"
        >
          ÷
        </button>

        <button
          onClick={() => handleDigit("4")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          4
        </button>
        <button
          onClick={() => handleDigit("5")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          5
        </button>
        <button
          onClick={() => handleDigit("6")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          6
        </button>
        <button
          onClick={() => handleOp("*")}
          className="bg-[#d9e2ec] hover:bg-[#c4d2e3] border border-gray-400 py-2 rounded active:scale-95 font-bold"
        >
          ×
        </button>

        <button
          onClick={() => handleDigit("1")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          1
        </button>
        <button
          onClick={() => handleDigit("2")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          2
        </button>
        <button
          onClick={() => handleDigit("3")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          3
        </button>
        <button
          onClick={() => handleOp("-")}
          className="bg-[#d9e2ec] hover:bg-[#c4d2e3] border border-gray-400 py-2 rounded active:scale-95 font-bold"
        >
          −
        </button>

        <button
          onClick={() => handleDigit("0")}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          0
        </button>
        <button
          onClick={handleDecimal}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded text-sm active:scale-95"
        >
          .
        </button>
        <button
          onClick={handleSign}
          className="bg-white hover:bg-gray-100 border border-gray-400 py-2 rounded active:scale-95"
        >
          ±
        </button>
        <button
          onClick={() => handleOp("+")}
          className="bg-[#d9e2ec] hover:bg-[#c4d2e3] border border-gray-400 py-2 rounded active:scale-95 font-bold"
        >
          +
        </button>

        <button
          onClick={handleSqrt}
          className="bg-[#d0d0d0] hover:bg-[#c0c0c0] border border-gray-400 py-1.5 rounded active:scale-95 font-bold"
        >
          √
        </button>
        <button
          onClick={handleClearEntry}
          className="bg-[#d0d0d0] hover:bg-[#c0c0c0] border border-gray-400 py-1.5 rounded active:scale-95"
        >
          CE
        </button>
        <button
          onClick={handleEquals}
          className="col-span-2 bg-[#2b548b] hover:bg-[#1a3a60] text-white border border-gray-500 py-1.5 rounded active:scale-95 font-bold text-sm"
        >
          =
        </button>
      </div>

      {onTransferDisplay && (
        <button
          onClick={handleTransfer}
          className="w-full bg-[#1b6b38] hover:bg-[#14532b] text-white text-xs py-1.5 rounded font-bold transition active:scale-95"
        >
          Transfer Display &rarr;
        </button>
      )}
    </div>
  );
}
