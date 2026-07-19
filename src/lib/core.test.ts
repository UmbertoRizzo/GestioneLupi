import { describe, expect, it } from "vitest";
import { canManageBranch, canReadBranchDocuments, canReadChild } from "./permissions";
import { appendExtension, normalizePersonCode, safeDriveName, slugify } from "./utils";

describe("nomi e codici", () => {
  it("normalizza i codici persona", () => {
    expect(normalizePersonCode("  ab 12 cd ")).toBe("AB12CD");
  });

  it("crea slug leggibili anche dagli accenti", () => {
    expect(slugify("Attivita estiva - Pavia 1")).toBe("attivita-estiva-pavia-1");
  });

  it("conserva l'estensione e rende sicuro il nome Drive", () => {
    expect(appendExtension("Carta d'identita", "scansione.PDF")).toBe("Carta d'identita.pdf");
    expect(safeDriveName("Modulo: privacy / 2026")).toBe("Modulo- privacy - 2026");
  });
});

describe("permessi", () => {
  const child = { id: "child-1", branchId: "branch-1" };

  it("consente al super admin di gestire ogni branca", () => {
    expect(canManageBranch({ id: "super", role: "SUPER_ADMIN" }, "branch-2")).toBe(true);
  });

  it("limita l'admin alla propria branca", () => {
    const admin = { id: "admin", role: "BRANCH_ADMIN" as const, branchIds: ["branch-1"] };
    expect(canReadChild(admin, child)).toBe(true);
    expect(canReadBranchDocuments(admin, "branch-2")).toBe(false);
  });

  it("consente al genitore solo i figli collegati", () => {
    const parent = { id: "parent", role: "PARENT" as const, childIds: ["child-1"] };
    expect(canReadChild(parent, child)).toBe(true);
    expect(canReadChild(parent, { id: "child-2", branchId: "branch-1" })).toBe(false);
  });
});
