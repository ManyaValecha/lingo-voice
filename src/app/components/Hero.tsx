import Image from "next/image"
import DynamicTagline from "./DynamicTagline"

export default function Hero() {
    const title = "Welcome to LINGOSWAP🗿"

    const taglines = [
        "That code? Straight giga, no cap. 🧠🔥",
        "Your code just got a productivity glow-up. 🚀",
        "Now that’s what I call a solid piece of programming. 👌",

        "We mewed your text—now it slaps. 😤📱",
        "Polished, efficient, and ready for LinkedIn. ✅",
        "Cleaned up your writing — now it reads like a pro manual. 📘",

        "Mid code? Fixed it. It’s bussin’ now. 💯⚡",
        "Upgraded your logic like a true side-hustle pro. 💼💡",
        "Got your syntax squared away — back in my day, we called that craftsmanship. 🧰",

        "Your output's so clean it could be on a FYP. 🧼📲",
        "That’s some peak adulting-level clarity. 📝✅",
        "Well-structured and to the point. Just like the manuals we used. 📚",
    ];


    return (
        <div className="w-full flex flex-wrap sm:flex-nowrap justify-center max-w-[800px]">
            <div className="max-w-40 sm:max-w-72 md:max-w-80">
                <Image src="/giga-chad.png" width={1600} height={1200} alt="Giga Chad" className="w-full" />
            </div>
            <div className="sm:mt-20 md:mt-24 w-full min-h-28">
                <div className="w-full text-center sm:text-start">
                    <h1 className="text-4xl font-bold text-white mb-1">{title}</h1>
                </div>
                <div className="w-full">
                    <DynamicTagline taglines={taglines} />
                    <p className="text-[9px] uppercase text-[rgb(150,150,150)] text-center sm:text-start">Powered by AI 🤖✨</p>
                </div>
            </div>
        </div>
    )
}
