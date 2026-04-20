import { describe, expect, it } from "vitest";
import { FILTERED, filterHeaders, filterValues } from "../filters.js";

describe("filterValues", () => {
  it("returns input unchanged when no patterns given", () => {
    const v = { password: "secret" };
    expect(filterValues(v, [])).toEqual({ password: "secret" });
  });

  it("redacts keys matching a string pattern (case-insensitive substring)", () => {
    expect(filterValues({ password: "s", Password: "t", other: "k" }, ["password"])).toEqual({
      password: FILTERED,
      Password: FILTERED,
      other: "k",
    });
  });

  it("redacts keys matching a regex pattern", () => {
    expect(filterValues({ api_key: "x", apikey_v2: "y", safe: "z" }, [/api.*key/i])).toEqual({
      api_key: FILTERED,
      apikey_v2: FILTERED,
      safe: "z",
    });
  });

  it("redacts through nested objects", () => {
    const v = { user: { password: "s", name: "a" }, meta: { token: "t" } };
    expect(filterValues(v, ["password", "token"])).toEqual({
      user: { password: FILTERED, name: "a" },
      meta: { token: FILTERED },
    });
  });

  it("redacts through arrays of objects", () => {
    const v = [{ password: "a" }, { name: "b" }];
    expect(filterValues(v, ["password"])).toEqual([{ password: FILTERED }, { name: "b" }]);
  });

  it("handles circular references without crashing", () => {
    const v: Record<string, unknown> = { password: "s", name: "a" };
    v.self = v;
    const out = filterValues(v, ["password"]) as Record<string, unknown>;
    expect(out.password).toBe(FILTERED);
    expect(out.name).toBe("a");
    expect(out.self).toBe(out);
  });

  it("substring matching mirrors Ruby: 'mypassword' matches 'password'", () => {
    expect(filterValues({ mypassword_v2: "s" }, ["password"])).toEqual({
      mypassword_v2: FILTERED,
    });
  });

  it("does not mutate input", () => {
    const input = { password: "s" };
    filterValues(input, ["password"]);
    expect(input.password).toBe("s");
  });
});

describe("filterHeaders", () => {
  it("returns empty object when headers are undefined", () => {
    expect(filterHeaders(undefined, ["authorization"])).toEqual({});
  });

  it("strips headers matching a string pattern (case-insensitive full-name)", () => {
    expect(
      filterHeaders({ Authorization: "x", "Content-Type": "json" }, ["authorization"]),
    ).toEqual({ "Content-Type": "json" });
  });

  it("strips headers matching a regex", () => {
    expect(filterHeaders({ "X-Auth-Token": "x", "X-Request-Id": "r" }, [/^x-auth/i])).toEqual({
      "X-Request-Id": "r",
    });
  });

  it("does not mutate input", () => {
    const input = { Authorization: "x", Accept: "*/*" };
    filterHeaders(input, ["authorization"]);
    expect(input).toEqual({ Authorization: "x", Accept: "*/*" });
  });
});
