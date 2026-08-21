import { createClient } from "@supabase/supabase-js";

const url = "https://cjybfvptlljzlllrfxzg.supabase.co";
const anonKey = "sb_publishable_-BwBKpV4_s3GA7eCo3On4A_slNTbNmb";

const supabase = createClient(url, anonKey);

async function testSignIn() {
  console.log("Testing sign in for admin@prepai.local...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@prepai.local",
    password: "adminpassword123"
  });

  if (error) {
    console.error("Sign in failed:", error.message);
  } else {
    console.log("Sign in successful! User ID:", data.user?.id, "Email:", data.user?.email);
  }
}

testSignIn();
