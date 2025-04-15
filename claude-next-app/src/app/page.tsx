"use client";

import React, { useState } from "react";

export default function Home() {
  // Array of emojis for floating elements
  const emojis = ["🚀", "✨", "💻", "🤖", "🦙", "🌈", "🔮", "🧠", "🌟", "🎯"];

  // Array of emojis for shooting stars - using fluid emojis instead of square block ones
  const shootingStarEmojis = ["🌠", "💫", "🌟", "🌈", "🔆", "🪐", "🌛"];

  // Create a shooting star emoji every 5 seconds and dragon flames
  React.useEffect(() => {
    // Function to create shooting stars
    const createShootingStar = () => {
      const shootingStarContainer = document.getElementById(
        "shooting-star-container",
      );
      if (!shootingStarContainer) return;

      // Create a new shooting star element
      const star = document.createElement("div");

      // Randomly select an emoji from the shootingStarEmojis array
      const emoji =
        shootingStarEmojis[
        Math.floor(Math.random() * shootingStarEmojis.length)
        ];

      // Set the content and styling
      star.textContent = emoji;
      star.className = "animate-shooting-star text-5xl";

      // Add a trailing effect with CSS
      star.style.textShadow =
        "0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.6), 0 0 45px rgba(255, 255, 255, 0.4)";

      // Randomize the starting position (top percentage)
      const startPosition = 20 + Math.random() * 60; // Between 20% and 80% from the top
      star.style.top = `${startPosition}%`;

      // Append the star to the container
      shootingStarContainer.appendChild(star);

      // Remove the star element after animation completes (8 seconds)
      setTimeout(() => {
        if (star && star.parentNode === shootingStarContainer) {
          shootingStarContainer.removeChild(star);
        }
      }, 8000);
    };

    // Function to create traveling flames from the dragon
    const createDragonFlame = () => {
      const flameContainer = document.getElementById("flame-container");
      if (!flameContainer) return;

      // Create a new flame element
      const flame = document.createElement("div");
      flame.textContent = "🔥";

      // Randomize flame size between small (6xl) and medium (9xl)
      const sizes = ["text-6xl", "text-7xl", "text-8xl", "text-9xl"];
      const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

      // Random slight offset for flame position
      const verticalOffset = Math.floor(Math.random() * 10) - 5; // -5px to +5px

      // Set flame styling
      flame.className = `${randomSize} animate-traveling-flame`;
      flame.style.position = "absolute";
      flame.style.bottom = `${verticalOffset}px`;

      // Random hue and brightness variations
      const hueRotate = Math.floor(Math.random() * 40) - 20; // -20deg to +20deg
      const brightness = 1 + Math.random() * 0.3; // 1.0 to 1.3
      flame.style.filter = `hue-rotate(${hueRotate}deg) saturate(170%) brightness(${brightness})`;

      // Add to container
      flameContainer.appendChild(flame);

      // Remove flame after animation completes (5 seconds)
      setTimeout(() => {
        if (flame && flame.parentNode === flameContainer) {
          flameContainer.removeChild(flame);
        }
      }, 5000);
    };

    // Create initial shooting star and flame
    createShootingStar();
    createDragonFlame();

    // Set intervals for both animations
    const shootingStarInterval = setInterval(createShootingStar, 5000);
    const dragonFlameInterval = setInterval(createDragonFlame, 800); // Create a new flame every 800ms

    // Clean up intervals on component unmount
    return () => {
      clearInterval(shootingStarInterval);
      clearInterval(dragonFlameInterval);
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-900 p-6 text-center">
      {/* Container for shooting stars */}
      <div
        id="shooting-star-container"
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      ></div>

      {/* Colorful polka dots */}
      {/* Castle image background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&q=80&w=1200&h=800"
            alt="Medieval Castle"
            className="h-full w-full object-cover opacity-10"
          />
        </div>

        {/* Giant Rainbow Arc */}
        <div className="pointer-events-none absolute inset-0 z-5 flex items-center justify-center">
          <div className="relative -top-[30vh] h-[240vh] w-[240vw]">
            <div className="animate-rainbow-glow absolute h-full w-full rounded-[50%] border-[40px] border-red-500 opacity-90"></div>
            <div className="animate-rainbow-glow absolute top-[2.5%] left-[2.5%] h-[95%] w-[95%] rounded-[50%] border-[40px] border-orange-500 opacity-90 delay-100"></div>
            <div className="animate-rainbow-glow absolute top-[5%] left-[5%] h-[90%] w-[90%] rounded-[50%] border-[40px] border-yellow-500 opacity-90 delay-200"></div>
            <div className="animate-rainbow-glow absolute top-[7.5%] left-[7.5%] h-[85%] w-[85%] rounded-[50%] border-[40px] border-green-500 opacity-90 delay-300"></div>
            <div className="animate-rainbow-glow absolute top-[10%] left-[10%] h-[80%] w-[80%] rounded-[50%] border-[40px] border-pink-500 opacity-90"></div>
            <div className="animate-rainbow-glow absolute top-[12.5%] left-[12.5%] h-[75%] w-[75%] rounded-[50%] border-[40px] border-purple-500 opacity-90 delay-100"></div>
            <div className="animate-rainbow-glow absolute top-[15%] left-[15%] h-[70%] w-[70%] rounded-[50%] border-[35px] border-pink-400 opacity-90 delay-200"></div>
          </div>
        </div>

        {/* Giant Dragon more to the left */}
        <div
          className="animate-dragon-pulse fixed right-20 bottom-16 text-[12rem]"
          style={{ zIndex: 50 }}
        >
          <span>🐉</span>

          {/* Fire effect container that creates traveling flames */}
          <div
            id="flame-container"
            className="absolute right-[120%] bottom-[38%]"
            style={{ zIndex: 51 }}
          ></div>
        </div>

        {/* Galloping Blue Rocket */}
        <div
          className="animate-gallop fixed bottom-8 left-0 z-30 text-8xl drop-shadow-xl"
          style={{ filter: "hue-rotate(220deg) saturate(200%)" }}
        >
          🚀
        </div>
        {/* Pink dots */}
        <div className="animate-sparkle absolute top-[10%] left-[15%] h-8 w-8 rounded-full bg-pink-400 opacity-60"></div>
        <div className="animate-sparkle absolute top-[35%] left-[80%] h-6 w-6 rounded-full bg-pink-300 opacity-50 delay-100"></div>
        <div className="animate-sparkle absolute top-[65%] left-[25%] h-10 w-10 rounded-full bg-pink-500 opacity-40 delay-200"></div>
        <div className="animate-sparkle absolute top-[5%] left-[55%] h-4 w-4 rounded-full bg-pink-200 opacity-70 delay-300"></div>
        <div className="animate-sparkle absolute top-[90%] left-[85%] h-5 w-5 rounded-full bg-pink-400 opacity-50"></div>
        <div className="animate-sparkle absolute top-[22%] left-[30%] h-7 w-7 rounded-full bg-pink-500 opacity-60 delay-200"></div>
        <div className="animate-sparkle absolute top-[48%] left-[88%] h-5 w-5 rounded-full bg-pink-300 opacity-50"></div>
        <div className="animate-sparkle absolute top-[72%] left-[12%] h-9 w-9 rounded-full bg-pink-400 opacity-40 delay-300"></div>
        <div className="animate-sparkle absolute top-[18%] left-[42%] h-6 w-6 rounded-full bg-pink-200 opacity-70 delay-100"></div>
        <div className="animate-sparkle absolute top-[82%] left-[78%] h-4 w-4 rounded-full bg-pink-500 opacity-50 delay-200"></div>

        {/* Purple dots */}
        <div className="animate-sparkle absolute top-[20%] left-[70%] h-12 w-12 rounded-full bg-purple-400 opacity-60 delay-200"></div>
        <div className="animate-sparkle absolute top-[75%] left-[65%] h-8 w-8 rounded-full bg-purple-300 opacity-50 delay-100"></div>
        <div className="animate-sparkle absolute top-[45%] left-[10%] h-5 w-5 rounded-full bg-purple-500 opacity-40"></div>
        <div className="animate-sparkle absolute top-[60%] left-[50%] h-7 w-7 rounded-full bg-purple-200 opacity-50 delay-300"></div>
        <div className="animate-sparkle absolute top-[25%] left-[35%] h-6 w-6 rounded-full bg-purple-400 opacity-60 delay-200"></div>
        <div className="animate-sparkle absolute top-[38%] left-[22%] h-10 w-10 rounded-full bg-purple-500 opacity-50"></div>
        <div className="animate-sparkle absolute top-[95%] left-[55%] h-9 w-9 rounded-full bg-purple-300 opacity-40 delay-200"></div>
        <div className="animate-sparkle absolute top-[28%] left-[5%] h-4 w-4 rounded-full bg-purple-400 opacity-70 delay-100"></div>
        <div className="animate-sparkle absolute top-[52%] left-[38%] h-7 w-7 rounded-full bg-purple-200 opacity-60 delay-300"></div>
        <div className="animate-sparkle absolute top-[12%] left-[75%] h-5 w-5 rounded-full bg-purple-500 opacity-50"></div>

        {/* Neon Pink dots */}
        <div className="animate-sparkle absolute top-[50%] left-[90%] h-9 w-9 rounded-full bg-pink-400 opacity-80 delay-200"></div>
        <div className="animate-sparkle absolute top-[85%] left-[40%] h-7 w-7 rounded-full bg-pink-300 opacity-70"></div>
        <div className="animate-sparkle absolute top-[15%] left-[45%] h-4 w-4 rounded-full bg-pink-500 opacity-80 delay-300"></div>
        <div className="animate-sparkle absolute top-[40%] left-[75%] h-6 w-6 rounded-full bg-pink-200 opacity-90 delay-100"></div>
        <div className="animate-sparkle absolute top-[70%] left-[20%] h-8 w-8 rounded-full bg-pink-400 opacity-80 delay-300"></div>
        <div className="animate-sparkle absolute top-[25%] left-[58%] h-5 w-5 rounded-full bg-pink-500 opacity-90 delay-100"></div>
        <div className="animate-sparkle absolute top-[78%] left-[72%] h-10 w-10 rounded-full bg-pink-300 opacity-80"></div>
        <div className="animate-sparkle absolute top-[32%] left-[18%] h-6 w-6 rounded-full bg-pink-400 opacity-90 delay-200"></div>
        <div className="animate-sparkle absolute top-[68%] left-[33%] h-4 w-4 rounded-full bg-pink-200 opacity-80 delay-300"></div>
        <div className="animate-sparkle absolute top-[42%] left-[65%] h-7 w-7 rounded-full bg-pink-500 opacity-90"></div>

        {/* Yellow/Orange dots */}
        <div className="animate-sparkle absolute top-[30%] left-[5%] h-6 w-6 rounded-full bg-yellow-300 opacity-60"></div>
        <div className="animate-sparkle absolute top-[55%] left-[60%] h-5 w-5 rounded-full bg-yellow-400 opacity-50 delay-200"></div>
        <div className="animate-sparkle absolute top-[8%] left-[85%] h-7 w-7 rounded-full bg-orange-300 opacity-40 delay-100"></div>
        <div className="animate-sparkle absolute top-[62%] left-[15%] h-8 w-8 rounded-full bg-yellow-400 opacity-50"></div>
        <div className="animate-sparkle absolute top-[18%] left-[48%] h-5 w-5 rounded-full bg-yellow-300 opacity-60 delay-300"></div>
        <div className="animate-sparkle absolute top-[88%] left-[28%] h-6 w-6 rounded-full bg-orange-400 opacity-40 delay-200"></div>
        <div className="animate-sparkle absolute top-[42%] left-[82%] h-9 w-9 rounded-full bg-yellow-500 opacity-50 delay-100"></div>
        <div className="animate-sparkle absolute top-[75%] left-[8%] h-4 w-4 rounded-full bg-orange-300 opacity-70"></div>
        <div className="animate-sparkle absolute top-[35%] left-[68%] h-7 w-7 rounded-full bg-yellow-400 opacity-40 delay-200"></div>
        <div className="animate-sparkle absolute top-[92%] left-[52%] h-5 w-5 rounded-full bg-orange-500 opacity-60 delay-300"></div>

        {/* Floating emojis - larger and staggered vertically */}
        <div className="animate-float absolute top-[10%] left-[20%] text-8xl">
          🐉
        </div>
        <div className="animate-float-slow absolute top-[60%] left-[75%] text-7xl delay-300">
          ✨
        </div>
        <div className="animate-float absolute top-[30%] left-[60%] text-8xl delay-100">
          🚀
        </div>
        <div className="animate-float-slow absolute top-[75%] left-[15%] text-7xl delay-200">
          💫
        </div>
        <div className="animate-float absolute top-[25%] left-[85%] text-8xl delay-300">
          🔮
        </div>
        <div className="animate-float-slow absolute top-[50%] left-[30%] text-7xl">
          ⚡
        </div>
        <div className="animate-float absolute top-[15%] left-[50%] text-8xl delay-200">
          🌈
        </div>
        <div className="animate-float-slow absolute top-[70%] left-[45%] text-7xl delay-100">
          🔮
        </div>
        <div className="animate-float absolute top-[40%] left-[10%] text-8xl delay-300">
          🤖
        </div>
        <div className="animate-float-slow absolute top-[85%] left-[70%] text-7xl delay-200">
          🎯
        </div>
      </div>

      {/* Rainbow vertical lines */}
      <div className="absolute top-10 right-0 left-0 z-0 flex h-40 w-full items-end justify-evenly overflow-hidden px-4">
        <div className="animate-height-pulse h-[90%] w-3 rounded-t-lg bg-red-500 opacity-80"></div>
        <div className="animate-height-pulse h-[85%] w-3 rounded-t-lg bg-orange-500 opacity-80 delay-100"></div>
        <div className="animate-height-pulse h-[95%] w-3 rounded-t-lg bg-yellow-500 opacity-80 delay-200"></div>
        <div className="animate-height-pulse h-[80%] w-3 rounded-t-lg bg-green-500 opacity-80 delay-300"></div>
        <div className="animate-height-pulse h-[100%] w-3 rounded-t-lg bg-pink-500 opacity-90"></div>
        <div className="animate-height-pulse h-[85%] w-3 rounded-t-lg bg-pink-400 opacity-90 delay-100"></div>
        <div className="animate-height-pulse h-[90%] w-3 rounded-t-lg bg-purple-500 opacity-80 delay-200"></div>
        <div className="animate-height-pulse h-[75%] w-3 rounded-t-lg bg-red-400 opacity-80 delay-300"></div>
        <div className="animate-height-pulse h-[95%] w-3 rounded-t-lg bg-orange-400 opacity-80"></div>
        <div className="animate-height-pulse h-[85%] w-3 rounded-t-lg bg-yellow-400 opacity-80 delay-100"></div>
        <div className="animate-height-pulse h-[100%] w-3 rounded-t-lg bg-green-400 opacity-80 delay-200"></div>
        <div className="animate-height-pulse h-[80%] w-3 rounded-t-lg bg-pink-300 opacity-90 delay-300"></div>
      </div>

      {/* Flying Nyan Cat */}
      <div className="animate-nyan-cat pointer-events-none fixed text-7xl">
        <div className="relative">
          <span className="text-7xl">🐱</span>
          <div className="absolute top-2 -left-56 -z-10 flex flex-row-reverse">
            <div className="h-5 w-8 rounded bg-red-500 opacity-80"></div>
            <div className="h-5 w-8 rounded bg-orange-500 opacity-80"></div>
            <div className="h-5 w-8 rounded bg-yellow-500 opacity-80"></div>
            <div className="h-5 w-8 rounded bg-green-500 opacity-80"></div>
            <div className="h-5 w-8 rounded bg-blue-500 opacity-80"></div>
            <div className="h-5 w-8 rounded bg-purple-500 opacity-80"></div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="animate-float absolute -top-16 -left-16 h-32 w-32 rounded-full bg-green-300 opacity-70 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-float absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-emerald-300 opacity-70 mix-blend-multiply blur-xl filter delay-200"></div>
        <div className="animate-spin-slow absolute top-1/4 right-1/3 h-16 w-16 rounded-full bg-teal-300 opacity-50 mix-blend-multiply blur-xl filter"></div>

        <div className="relative z-30 rounded-xl border-4 border-pink-400 bg-white/80 p-8 shadow-2xl backdrop-blur-md dark:bg-black/80">
          <h1 className="animate-float mb-4 flex items-center justify-center bg-gradient-to-r from-pink-400 via-purple-500 to-pink-600 bg-clip-text text-5xl font-bold text-transparent">
            <span className="mr-3 text-6xl">🔮</span> Claude Code Go!{" "}
            <span className="ml-3 text-6xl">⚡</span>
          </h1>
          <p className="animate-fadeIn mb-4 text-xl">This is my Next.js app.</p>
          <p className="animate-slideUp mb-4 text-lg delay-100">
            With Claude Code Go, you can code from anywhere on your mobile
            device!{" "}
            <span
              className="font-bold"
              style={{
                textDecoration: "underline",
                textDecorationThickness: "2px",
              }}
            >
              Vibe-code
            </span>{" "}
            at the beach, in a cafe, or on your commute.
          </p>
          <p className="animate-slideUp mb-4 text-lg text-gray-600 delay-200 dark:text-gray-400">
            Try asking Claude to modify this page, add new features, or create
            entirely new components!
          </p>

          <button
            className="transform rounded-lg bg-gradient-to-r from-pink-400 via-purple-500 to-pink-600 px-6 py-3 text-lg font-bold text-white transition-all hover:scale-105 hover:shadow-lg"
            onClick={() => {
              // Create a container for the unicorns if it doesn't exist
              let unicornContainer =
                document.getElementById("unicorn-container");
              if (!unicornContainer) {
                unicornContainer = document.createElement("div");
                unicornContainer.id = "unicorn-container";
                unicornContainer.className =
                  "fixed bottom-0 left-0 w-full z-50 pointer-events-none";
                document.body.appendChild(unicornContainer);
              }

              // Create a new unicorn with prancing animation
              const unicorn = document.createElement("div");
              unicorn.textContent = "🦄";
              unicorn.className = "text-7xl animate-prancing-unicorn";

              // Add sparkle trail with vibrant colors
              unicorn.style.textShadow =
                "0 0 15px rgba(255, 50, 255, 0.9), 0 0 30px rgba(180, 100, 255, 0.8), 0 0 45px rgba(100, 200, 255, 0.6)";

              // Random slight offset for multiple unicorns
              const verticalOffset = Math.floor(Math.random() * 20);
              unicorn.style.marginBottom = `${verticalOffset}px`;

              unicornContainer.appendChild(unicorn);

              // Remove unicorn after animation completes
              setTimeout(() => {
                if (unicorn && unicorn.parentNode === unicornContainer) {
                  unicornContainer.removeChild(unicorn);
                }

                // Remove container if no more unicorns
                if (
                  unicornContainer &&
                  unicornContainer.childNodes.length === 0
                ) {
                  document.body.removeChild(unicornContainer);
                }
              }, 18000); // Prancing unicorn animation is 18s
            }}
          >
            Add Unicorn
          </button>
        </div>
      </div>

      {/* Container for unicorns will be created dynamically */}
    </main>
  );
}
