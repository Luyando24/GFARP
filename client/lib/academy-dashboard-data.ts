export function normalizeAcademyDashboardProfile(data: any): any | null {
  if (!data?.id) return null;

  return {
    ...data,
    address: data.address ?? data.location ?? "",
    phone: data.phone ?? "",
    foundedYear: data.foundedYear ?? data.founded_year ?? data.established ?? "",
    directorName:
      data.directorName ?? data.director_name ?? data.director?.name ?? data.contactPerson ?? "",
    directorEmail:
      data.directorEmail ?? data.director_email ?? data.director?.email ?? "",
    directorPhone:
      data.directorPhone ?? data.director_phone ?? data.director?.phone ?? "",
  };
}

export function hasCurrentSubscription(data: any): boolean {
  return Boolean(data?.subscription);
}

export function getDashboardPlayerTotal(playersResult: any, statsResult: any): number {
  if (playersResult?.success) {
    return Number(playersResult.data?.pagination?.total) || 0;
  }
  return Number(statsResult?.data?.totalPlayers) || 0;
}
