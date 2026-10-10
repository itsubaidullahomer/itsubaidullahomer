import "server-only";
export type ContributionDay = { date: string; count: number };
export async function getContributions(): Promise<{
  days: ContributionDay[];
  complete: boolean;
  label: string;
}> {
  try {
    if (process.env.GITHUB_TOKEN) {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            '{ user(login: "itsubaidullahomer") { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }',
        }),
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const data = await response.json();
        const weeks =
          data.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
        if (weeks)
          return {
            days: weeks.flatMap(
              (w: {
                contributionDays: { date: string; contributionCount: number }[];
              }) =>
                w.contributionDays.map((d) => ({
                  date: d.date,
                  count: d.contributionCount,
                })),
            ),
            complete: true,
            label: "GitHub contributions over the past year. Refreshed daily.",
          };
      }
    }
    const response = await fetch(
      "https://api.github.com/users/itsubaidullahomer/events/public?per_page=100",
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!response.ok) throw new Error("GitHub unavailable");
    const events = (await response.json()) as {
      type: string;
      created_at: string;
    }[];
    const counts = new Map<string, number>();
    for (const e of events) {
      if (
        [
          "PushEvent",
          "PullRequestEvent",
          "IssuesEvent",
          "CreateEvent",
        ].includes(e.type)
      ) {
        const date = e.created_at.slice(0, 10);
        counts.set(date, (counts.get(date) || 0) + 1);
      }
    }
    return {
      days: [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      complete: false,
      label:
        "Recent public activity from GitHub’s events API. This is a partial window, not the full contribution graph.",
    };
  } catch {
    return {
      days: [],
      complete: false,
      label:
        "GitHub’s activity feed is unavailable right now. You can view the public profile directly.",
    };
  }
}
