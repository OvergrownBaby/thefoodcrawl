/**
 * Renders a JSON-LD <script> tag. Drop into any server component:
 *   <JsonLd data={placeJsonLd(restaurant, mentions)} />
 * The `<` escaping prevents a `</script>` breakout from any user-derived string.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
