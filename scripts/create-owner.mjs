// Cria (ou promove) a PROPRIETÁRIA do painel.
// Roda só no seu computador, uma vez:  npm run create-owner
// Lê do .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME
// Depois de rodar, APAGUE OWNER_PASSWORD e SUPABASE_SERVICE_ROLE_KEY do .env.local.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const password = process.env.OWNER_PASSWORD ?? "";
const name = process.env.OWNER_NAME ?? "Proprietária";

if (!url || !serviceKey || !email) {
  console.error("Faltam variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e OWNER_EMAIL no .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(e) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === e);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
if (!user) {
  if (password.length < 12) {
    console.error("OWNER_PASSWORD precisa ter pelo menos 12 caracteres.");
    process.exit(1);
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    console.error("Erro ao criar usuária:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("Usuária criada:", email);
} else {
  console.log("Usuária já existia:", email, "— só garantindo o perfil de proprietária.");
}

const { error: pErr } = await admin.from("profiles").upsert({ id: user.id, full_name: name, role: "owner", active: true });
if (pErr) {
  console.error("Erro ao criar perfil:", pErr.message);
  process.exit(1);
}
console.log("Pronto! Entre em /admin/login. Agora apague OWNER_PASSWORD e SUPABASE_SERVICE_ROLE_KEY do .env.local.");
