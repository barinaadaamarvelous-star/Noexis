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
    <div className="min-h-screen p-6 bg-white dark:bg-[#020617] text-black dark:text-white">
      <h1 style={styles.title}>📊 Discipline Analytics</h1>

      {/* CHART */}
      <div className="bg-gray-100 dark:bg-[#0f172a] p-5 rounded-xl mb-8">
        <h2 style={styles.cardTitle}>Activity</h2>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={activityData}>
            <XAxis
              dataKey="date"
              stroke="#aaa"
              tickFormatter={(value) =>
                format(new Date(value), "MMM d")
              }
            />
            <YAxis stroke="#aaa" />
            <Tooltip
              labelFormatter={(value) =>
                format(new Date(value), "MMM d, yyyy")
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CALENDAR */}
      <div
        style={styles.card}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HEADER */}
        <div style={styles.header}>
          <button
            className="bg-gray-200 dark:bg-[#1e293b] text-black dark:text-white px-3 py-2 rounded-lg"
            onClick={() =>
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() - 1,
                  1
                )
              )
            }
          >
            ←
          </button>

          <h2 style={styles.cardTitle}>
            {format(currentDate, "MMMM yyyy")}
          </h2>

          <button
            style={styles.navBtn}
            onClick={() =>
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1,
                  1
                )
              )
            }
          >
            →
          </button>
        </div>

        {/* WEEK DAYS */}
        <div className="grid grid-cols-7 mb-2 text-gray-500 dark:text-gray-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={styles.weekDay}>
              {d}
            </div>
          ))}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startDayIndex }).map((_, i) => (
            <div key={i} />
          ))}

          {days.map((day) => {
            const formattedDay = format(day, "yyyy-MM-dd");

            const activity = activityData.find(
              (item) => item.date === formattedDay
            );

            const hasActivity = activity && activity.value > 0;

            const isToday =
              format(day, "yyyy-MM-dd") ===
              format(today, "yyyy-MM-dd");

            return (
              <div
                key={formattedDay}
                 className={`
               h-14 rounded-lg flex items-center justify-center font-medium cursor-pointer transition
              ${hasActivity 
                  ? "bg-green-600 text-white" 
                  : "bg-gray-200 dark:bg-[#1e293b] text-black dark:text-white"}
               ${isToday ? "border-2 border-green-500" : ""}
               `}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
    </AuthGuard>
  );
}


// ✅ STYLES
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    background: "#020617",
    minHeight: "100vh",
    padding: "30px",
    color: "white",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  card: {
    background: "#0f172a",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
    touchAction: "pan-y",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  navBtn: {
    background: "#1e293b",
    border: "none",
    color: "white",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
  },
  weekRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: "10px",
    color: "#94a3b8",
  },
  weekDay: {
    textAlign: "center",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "10px",
  },
  day: {
    height: "60px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "500",
    cursor: "pointer",
  },
};
