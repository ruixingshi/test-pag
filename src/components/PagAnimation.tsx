import { useEffect, useRef, useState } from "react";
import { PAGInit } from "libpag";

interface PAGView {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  destroy(): void;
  setRepeatCount(count: number): void;
}

interface PagAnimationProps {
  pagFile: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

export default function PagAnimation({
  pagFile,
  width = 300,
  height = 300,
  autoPlay = true,
  loop = true,
  className = "",
}: PagAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pagViewRef = useRef<PAGView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initPagAnimation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!canvasRef.current) {
          throw new Error("Canvas element not found");
        }

        // Initialize PAG module with locateFile configuration
        const PAG = await PAGInit({
          locateFile: (path: string) => {
            // For .wasm files, use the path from public directory
            if (path.endsWith(".wasm")) {
              return `/${path}`;
            }
            return path;
          },
        });

        // Fetch PAG file
        const response = await fetch(pagFile);
        if (!response.ok) {
          throw new Error(`Failed to load PAG file: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();

        // Load PAG file
        const pagFileInstance = await PAG.PAGFile.load(buffer);
        if (!pagFileInstance) {
          throw new Error("Failed to load PAG file");
        }

        if (!isMounted) return;

        // Set canvas size
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;

        // Create PAG view
        const pagView = await PAG.PAGView.init(pagFileInstance, canvas);
        if (!pagView) {
          throw new Error("Failed to create PAG view");
        }

        pagViewRef.current = pagView;

        // Configure playback before playing
        if (loop) {
          // Try different methods to ensure infinite loop
          try {
            (pagView as any).setRepeatCount(-1); // -1 means infinite loop
          } catch (e) {
            console.warn(
              "setRepeatCount not available, using alternative approach"
            );
          }
        }

        // Start playback if autoPlay is enabled
        if (autoPlay) {
          await (pagView as PAGView).play();

          // Add event listener to restart when animation ends (fallback)
          if (loop) {
            const canvas = canvasRef.current;
            if (canvas) {
              // Set up a timer as fallback to ensure continuous playback
              const intervalId = setInterval(() => {
                if (pagViewRef.current && isMounted) {
                  try {
                    const progress =
                      (pagViewRef.current as any).getProgress?.() || 0;
                    // If animation seems to have stopped (progress near 1), restart it
                    if (progress >= 0.99) {
                      (pagViewRef.current as any).setProgress(0);
                      (pagViewRef.current as any).play();
                    }
                  } catch (e) {
                    // Ignore errors in fallback mechanism
                  }
                }
              }, 100);

              // Store interval ID for cleanup
              (pagView as any)._loopIntervalId = intervalId;
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("PAG animation error:", err);
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Unknown error occurred"
          );
          setIsLoading(false);
        }
      }
    };

    initPagAnimation();

    return () => {
      isMounted = false;
      if (pagViewRef.current) {
        try {
          // Clean up loop interval if it exists
          const intervalId = (pagViewRef.current as any)._loopIntervalId;
          if (intervalId) {
            clearInterval(intervalId);
          }
          pagViewRef.current.destroy();
        } catch (err) {
          console.warn("Error destroying PAG view:", err);
        }
        pagViewRef.current = null;
      }
    };
  }, [pagFile, width, height, autoPlay, loop]);

  // Public methods for future use
  // const play = async () => {
  //   if (pagViewRef.current) {
  //     await pagViewRef.current.play();
  //   }
  // };

  // const pause = () => {
  //   if (pagViewRef.current) {
  //     pagViewRef.current.pause();
  //   }
  // };

  // const stop = () => {
  //   if (pagViewRef.current) {
  //     pagViewRef.current.stop();
  //   }
  // };

  if (error) {
    return (
      <div className={`pag-error ${className}`} style={{ width, height }}>
        <p>Failed to load animation: {error}</p>
      </div>
    );
  }

  return (
    <div
      className={`pag-container ${className}`}
      style={{ width, height, position: "relative" }}
    >
      {isLoading && (
        <div
          className="pag-loading"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
        >
          Loading animation...
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          opacity: isLoading ? 0 : 1,
          // transition: "opacity 0.3s ease",
          backgroundColor: "black",
        }}
      />
    </div>
  );
}

// Export additional utility functions if needed
export { PagAnimation };
