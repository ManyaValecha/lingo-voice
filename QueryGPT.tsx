'use client';

import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import SuspenseComponent from "./SuspenseComponent";
import { IoArrowUpCircleOutline, IoCopyOutline } from "react-icons/io5";
import { MdRestartAlt } from "react-icons/md";
import AuthorPlug from "./AuthorPlug";
import { toast } from "sonner";

export default function QueryGPT({ placeholder }: { placeholder: string }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxHeight = 200;

  const autoGrow = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    autoGrow();
  }, [query]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>, 
    reset = false
  ) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setResult("");

    const inputQuery = reset ? lastQuery : query.trim();

    if (!inputQuery) {
      setTimeout(() => {
        setResult("🛑 Please enter a valid prompt!");
        toast.error("Query is empty!", {
          description: 'Let’s not ghost the input field 🧃',
          classNames: { icon: "text-red-700" },
        });
        setIsLoading(false);
      }, 800);
      return;
    }

    try {
      const message = await queryCohere(inputQuery);
      const parsed = parseResponse(message);
      setResult(parsed);
      setLastQuery(inputQuery);
    } catch (err: any) {
      console.error(err);
      toast.error("API Error ❌", {
        description: err.message || "Something went wrong.",
      });
      setResult("❗ API failed. Try again later.");
    }

    setIsLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success("Copied!", {
        description: "You’ve got the power ⚡",
      });
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const parseResponse = (raw: string) => {
    const lines = raw.split('\n').filter(Boolean);
    const genz = lines.find(line => line.toLowerCase().startsWith("gen z:")) || "Gen Z: 🤔";
    const millennial = lines.find(line => line.toLowerCase().startsWith("millennial:")) || "Millennial: 🤔";
    const boomer = lines.find(line => line.toLowerCase().startsWith("boomer:")) || "Boomer: 🤔";
    return `${genz}\n\n${millennial}\n\n${boomer}`;
  };

  return (
    <div className="w-full px-4 sm:px-0 flex justify-center mt-10 sm:mt-0">
      <form className="w-full max-w-2xl" onSubmit={handleSubmit}>
        <Label className="text-white text-sm font-semibold">🧠 Ask Me Anything</Label>
        <div className="relative mt-2">
          <Textarea
            ref={textareaRef}
            disabled={isLoading}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 pr-16 py-2 resize-none overflow-hidden h-[80px] rounded-md border border-zinc-700 bg-zinc-900 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            aria-label="Submit Query"
            type="submit"
            disabled={isLoading}
            className="absolute right-3 bottom-3 text-white"
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-b-transparent rounded-full" />
            ) : (
              <IoArrowUpCircleOutline className="text-2xl hover:text-violet-400 transition" />
            )}
          </button>
        </div>

        {result ? (
          <div className="mt-6">
            <Label className="text-white text-sm font-semibold">📨 Response</Label>
            <div className="mt-2 p-3 text-sm rounded-md border border-zinc-700 bg-zinc-800 text-white">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]} className="prose prose-invert whitespace-pre-wrap">
                {result}
              </ReactMarkdown>
              <div className="flex gap-2 mt-3 text-sm">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md flex items-center gap-1"
                >
                  <IoCopyOutline size={16} /> Copy
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isLoading || lastQuery.length === 0}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md flex items-center gap-1"
                >
                  <MdRestartAlt size={16} /> Retry
                </button>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="mt-6">
      
          </div>
        ) : null}

        <div className="mt-8">
          <AuthorPlug />
        </div>
      </form>
    </div>
  );
}

// Backend API call
async function queryCohere(prompt: string): Promise<string> {
  const res = await fetch("/api/cohere", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Unknown error from Cohere API");
  }

  const data = await res.json();
  return data.message;
}
