"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // 隱藏 V1 導覽列在 V2 路由中
  if (pathname?.startsWith('/v2')) {
    return null;
  }
  
  return <Navbar />;
}