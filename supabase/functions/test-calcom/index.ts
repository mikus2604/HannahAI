// supabase/functions/test-calcom/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch credentials from api_keys
    const { data, error } = await supabase
      .from("api_keys")
      .select("key_name, key_value")
      .eq("user_id", user_id)
      .in("key_name", ["calcom_username", "calcom_api_key"]);

    if (error || !data || data.length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Cal.com credentials not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const creds: Record<string, string> = {};
    for (const item of data) {
      creds[item.key_name] = item.key_value;
    }

    const username = creds["calcom_username"];
    const apiKey = creds["calcom_api_key"];

    // Validate via Cal.com API
    const res = await fetch(`https://api.cal.com/v1/users/${username}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new Response(JSON.stringify({
        success: false,
        error: `Cal.com API request failed: ${errorText}`
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const profile = await res.json();

    return new Response(JSON.stringify({
      success: true,
      message: `Connected as ${profile.username}`
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
