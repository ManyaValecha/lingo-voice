'use client'

import React, { useEffect, useState, useRef } from "react"
import ReactMarkdown from 'react-markdown';
import hljs from "highlight.js";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import SuspenseComponent from "./SuspenseComponent";
import { IoArrowUpCircleOutline, IoCopyOutline } from "react-icons/io5";
import { MdRestartAlt } from "react-icons/md";
import AuthorPlug from "./AuthorPlug";
import { toast } from "sonner";

export default function QueryGPT({ placeholder }: { placeholder: string }) {
    const [query, setQuery] = useState<string>("")
    const [result, setResult] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [lastQuery, setLastQuery] = useState<string>("")

    const handleSubmit = async (
      e: React.FormEvent<HTMLFormElement> | React.FormEvent<HTMLButtonElement | MouseEvent>, 
      reset = false
    ) => {
        e.preventDefault()
        setIsLoading(true)
        setResult("")

        if (query.length === 0 && !reset) {
            setTimeout(() => {
                setResult("Ayo, you gotta write something first my homie 🤷‍♂️")
                toast.error('Please don\'t leave the query blank homie 🗿', {
                    description: 'You can’t just leave me hanging like that, fam! 🤨',
                    classNames: { icon: "text-red-700" }
                });
                setIsLoading(false)
            }, 1000)
            return
        }

        const chatQuery = reset ? lastQuery : query

        try {
            const message = await queryCohere(chatQuery)
            setResult(`Gen Z: ${message.genz}\n\nMillennial: ${message.millennial}\n\nBoomer: ${message.boomer}`)
            setLastQuery(chatQuery)
        } catch {
            setResult("Something went wrong. Try again later 🙇")
        }

        setIsLoading(false)
    }

    const handleCopy = (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        navigator.clipboard.writeText(result).then(() => {
            toast.success('Copied to clipboard! 📋', {
                description: 'You can flex that result wherever you want, fam! ✨💅'
            });
        }).catch(() => {
            toast.error("Could not copy the text. Select it manually.");
        });
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const maxHeight = 200;

    const autoGrow = () => {
        if (textareaRef.current && textareaRef.current.scrollHeight < maxHeight && textareaRef.current.scrollHeight > textareaRef.current.clientHeight) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }

    useEffect(() => {
        if(textareaRef.current) {
          autoGrow()
        }
    }, [query])

    useEffect(() => {
        hljs.highlightAll();
    }, [result]);

    const buttonCss = "p-1.5 disabled:cursor-not-allowed transition disabled:text-[rgb(130,130,130)] text-white bg-zinc-800 disabled:bg-zinc-900 rounded-md"

    return (
        <div className="w-full justify-center flex translate-y-10 sm:translate-y-0 sm:static">
            <form className="w-full max-w-[800px] min-h-60 rounded-sm" onSubmit={handleSubmit}>
                <div className="w-full">
                    <Label className="text-white text-sm font-bold">GenZify anything</Label>
                    <div className="flex relative mt-2">
                        <Textarea 
                          ref={textareaRef} 
                          disabled={isLoading} 
                          className="flex-1 w-full px-4 pr-20 py-2 h-[80px] min-h-[80px]" 
                          value={query} 
                          placeholder={placeholder} 
                          onChange={(e) => setQuery(e.target.value)} 
                        />
                        <div className="flex items-center absolute right-2 bottom-2 justify-center">
                            <button disabled={isLoading} type="submit" className={`${buttonCss} p-2`}>
                                <IoArrowUpCircleOutline className="text-lg" />
                            </button>
                        </div>
                    </div>
                </div>

                {
                    result ?
                        <div className="w-full mt-4">
                            <Label className="text-white text-sm font-bold">Response</Label>
                            <ReactMarkdown className="mt-2 h-full w-full text-sm gpt-result px-3 py-2 border-zinc-800 border rounded-md">{result}</ReactMarkdown>
                            <div className="flex items-center mt-2 text-[13px]">
                                <button onClick={handleCopy} className={`${buttonCss} mr-1`}>
                                    <IoCopyOutline size={14} className="-scale-x-100" />
                                </button>
                                <button 
                                  onClick={(e) => handleSubmit(e, true)} 
                                  disabled={isLoading || lastQuery.length === 0} 
                                  type="reset" 
                                  className={buttonCss}
                                >
                                    <MdRestartAlt size={14} />
                                </button>
                            </div>
                        </div>
                        : isLoading ? <SuspenseComponent /> : null
                }
                <AuthorPlug />
            </form>
        </div>
    )
}

// API fetch helper
async function queryCohere(prompt: string): Promise<{ genz: string; millennial: string; boomer: string }> {
    const res = await fetch('/api/cohere', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Unknown error calling API');
    }
  
    return res.json();
}
