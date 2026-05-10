REVOKE EXECUTE ON FUNCTION public.book_session(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_session(UUID) TO authenticated;