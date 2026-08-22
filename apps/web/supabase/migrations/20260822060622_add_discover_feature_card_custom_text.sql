alter table public.discover_feature_card_artists
  add column if not exists custom_text text;

alter table public.discover_feature_card_artists
  add constraint discover_feature_card_artists_custom_text_length_check
  check (custom_text is null or char_length(custom_text) <= 160);
