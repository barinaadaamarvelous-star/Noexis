 "use client";

import React from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import BottomNav from "@/components/BottomNav";

export default function CalendarPage() {
  // ✅ STATE
  const [loading, setLoading] = React.useState(true);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [activityData, setActivityData] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any>(null);
  
  

  // ✅ GET USER
  React.useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  // ✅ FETCH REAL ACTIVITY FROM task_logs
  React.useEffect(() => {
  if (!user) return;

  const fetchActivity = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("task_logs")
        .select("completed_at")
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        return;
      }

      const grouped: Record<string, number> = {};

      data.forEach((item: any) => {
        const date = format(new Date(item.completed_at), "yyyy-MM-dd");

        if (!grouped[date]) grouped[date] = 0;
        grouped[date]++;
      });

      const formattedData = Object.keys(grouped).map((date) => ({
        date,
        value: grouped[date],
      }));

      formattedData.sort((a, b) => a.date.localeCompare(b.date));

      setActivityData(formattedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // ✅ IMPORTANT
    }
  };

  fetchActivity();
  }, [user]);

  const today = new Date();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const startDayIndex = getDay(monthStart);

  // ✅ SWIPE
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;

    if (distance > 50) {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    }

    if (distance < -50) {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    }
  };
  React.useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel("task_logs_live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "task_logs",
      },
      async (payload) => {

        const newLog = payload.new as any;

        // only current user
        if (newLog.user_id !== user.id) return;

        // refetch instantly
        const { data } = await supabase
          .from("task_logs")
          .select("completed_at")
          .eq("user_id", user.id);

        const grouped: Record<string, number> = {};

        data?.forEach((item: any) => {
          const date = format(
            new Date(item.completed_at),
            "yyyy-MM-dd"
          );

          if (!grouped[date]) grouped[date] = 0;

          grouped[date]++;
        });

        const formattedData = Object.keys(grouped).map((date) => ({
          date,
          value: grouped[date],
        }));

        formattedData.sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        setActivityData(formattedData);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
  if (loading) {
  return (
    <main className="min-h-screen p-6 bg-white dark:bg-[#020617]">
      <div className="animate-pulse space-y-6">

        <div className="h-8 w-60 bg-gray-300 dark:bg-gray-700 rounded"></div>

        <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>

        <div className="h-80 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>

      </div>
    </main>
  );
  }
  return (
  <AuthGuard>
    <main className="
      min-h-screen
      bg-[#f5f5f5] dark:bg-black
      text-black dark:text-white
      px-4 py-6 pb-24
      flex justify-center
    ">

      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="mb-8">

          <p className="text-xs uppercase tracking-[3px] text-yellow-500 mb-2">
            Analytics
          </p>

          <h1 className="text-3xl font-bold">
            Discipline Calendar
          </h1>

        </div>

        {/* ACTIVITY CHART */}
        <div className="
          rounded-3xl
          border border-gray-200 dark:border-yellow-500/10
          bg-white dark:bg-[#0d0d0d]
          shadow-xl
          p-5 mb-6
        ">

          <div className="flex items-center justify-between mb-5">

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Activity
              </p>

              <h2 className="text-xl font-bold">
                Focus Sessions
              </h2>
            </div>

            <div className="
              px-3 py-1 rounded-full text-xs
              bg-green-100 text-green-700
              dark:bg-green-500/10 dark:text-green-400
              border border-green-200 dark:border-green-500/20
            ">
              Live
            </div>

          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={activityData}>

              <XAxis
                dataKey="date"
                stroke="#737373"
                tickFormatter={(value) =>
                  format(new Date(value), "MMM d")
                }
              />

              <YAxis stroke="#737373" />

              <Tooltip
                contentStyle={{
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: "14px",
                  color: "white",
                }}
                labelFormatter={(value) =>
                  format(new Date(value), "MMM d, yyyy")
                }
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#eab308"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                }}
              />

            </LineChart>
          </ResponsiveContainer>

        </div>

        {/* CALENDAR */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="
            rounded-3xl
            border border-gray-200 dark:border-white/10
            bg-white dark:bg-[#0d0d0d]
            shadow-xl
            p-5
          "
        >

          {/* MONTH HEADER */}
          <div className="flex items-center justify-between mb-6">

            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1
                  )
                )
              }
              className="
                w-10 h-10 rounded-full
                bg-gray-100 dark:bg-white/5
                border border-gray-200 dark:border-white/10
                hover:scale-105 transition
              "
            >
              ←
            </button>

            <div className="text-center">

              <p className="text-xs uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                Monthly Overview
              </p>

              <h2 className="text-xl font-bold mt-1">
                {format(currentDate, "MMMM yyyy")}
              </h2>

            </div>

            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1
                  )
                )
              }
              className="
                w-10 h-10 rounded-full
                bg-gray-100 dark:bg-white/5
                border border-gray-200 dark:border-white/10
                hover:scale-105 transition
              "
            >
              →
            </button>

          </div>

          {/* WEEK DAYS */}
          <div className="
            grid grid-cols-7
            mb-3
            text-center
            text-xs
            uppercase tracking-wide
            text-gray-500 dark:text-gray-400
          ">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>
                {d}
              </div>
            ))}
          </div>

          {/* DAYS */}
          <div className="grid grid-cols-7 gap-2">

            {Array.from({ length: startDayIndex }).map((_, i) => (
              <div key={i} />
            ))}

            {days.map((day) => {

              const formattedDay = format(day, "yyyy-MM-dd")

              const activity = activityData.find(
                (item) => item.date === formattedDay
              )

              const hasActivity = activity && activity.value > 0

              const isToday =
                format(day, "yyyy-MM-dd") ===
                format(today, "yyyy-MM-dd")

              return (
                <div
                  key={formattedDay}
                  className={`
                    aspect-square
                    rounded-2xl
                    flex items-center justify-center
                    text-sm font-semibold
                    transition-all duration-200
                    border

                    ${
                      hasActivity
                        ? `
                          bg-yellow-500
                          text-black
                          border-yellow-400
                          shadow-[0_0_18px_rgba(234,179,8,0.35)]
                        `
                        : `
                          bg-gray-100
                          dark:bg-white/5
                          border-gray-200
                          dark:border-white/10
                          text-black
                          dark:text-white
                        `
                    }

                    ${
                      isToday
                        ? "ring-2 ring-cyan-400 scale-105"
                        : ""
                    }
                  `}
                >

                  <div className="relative">

                    {format(day, "d")}

                    {hasActivity && (
                      <span className="
                        absolute -bottom-2 left-1/2
                        -translate-x-1/2
                        w-1.5 h-1.5
                        rounded-full
                        bg-black
                      " />
                    )}

                  </div>

                </div>
              )
            })}

          </div>

        </div>

      </div>

      <BottomNav />
    </main>
  </AuthGuard>
)
}
