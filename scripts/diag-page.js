async (page) => {
  const pageData = {
    title: await page.title(),
    url: page.url(),
    headings: await page.getByRole('heading').allTextContents(),
    visibleLinks: await page.getByRole('link').evaluateAll((links) =>
      links
        .filter((link) => link instanceof HTMLElement && link.offsetParent !== null)
        .map((link) => ({
          text: link.textContent?.trim() ?? '',
          href: link.getAttribute('href') ?? '',
        })),
    ),
  };

  return pageData;
}
