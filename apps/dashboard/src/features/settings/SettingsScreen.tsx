import { useMemo, useState } from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  errorMessage,
  getGetSettingsQueryKey,
  toApiError,
  useGetSettings,
  useUpdateSettings,
  type OpeningHoursEntry,
  type Settings,
} from "@odyssey/api-client";
import { DAYS_OF_WEEK, type DayOfWeek } from "@odyssey/types";
import {
  ErrorState,
  FormRow,
  InlineAlert,
  PageHeader,
  SaveBar,
  Section,
  Skeleton,
  Stepper,
  Surface,
  Switch,
  Text,
  TextInput,
  space,
  useToast,
} from "@odyssey/ui";
import { dayLabel } from "./format";

export function SettingsScreen() {
  const query = useGetSettings();
  const saved = query.data?.status === 200 ? query.data.data : undefined;

  return (
    <View>
      <PageHeader
        title="Settings"
        subtitle="Service switches, prep time, and when the kitchen is open."
      />

      {query.isPending ? (
        <Surface>
          <View style={{ gap: space[3] }}>
            <Skeleton width={200} height={22} />
            <Skeleton width="70%" />
            <Skeleton width="50%" />
          </View>
        </Surface>
      ) : query.isError ? (
        <Surface padded={false}>
          <ErrorState cause={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        </Surface>
      ) : saved ? (
        <View style={{ gap: space[4] }}>
          {/* Two cards, two SaveBars: each PATCHes only its own fields, so one
              being dirty never blocks saving the other. */}
          <ServiceSettingsCard saved={saved} />
          <OpeningHoursCard saved={saved} />
        </View>
      ) : null}
    </View>
  );
}

/** Both cards share the mutation, its invalidation and its toast. */
function useSaveSettings(what: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useUpdateSettings({
    mutation: {
      onSuccess: async () => {
        // The header pill derives from these, so it is stale the moment they change.
        await queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast(`${what} saved`);
      },
      onError: (error) => toast(errorMessage(error), "error"),
    },
  });
}

function ServiceSettingsCard({ saved }: { saved: Settings }) {
  const save = useSaveSettings("Service settings");
  const [draft, setDraft] = useState({
    isAcceptingOrders: saved.isAcceptingOrders,
    isAutoAccepting: saved.isAutoAccepting,
    prepTimeMinutes: saved.prepTimeMinutes,
  });

  const dirty =
    draft.isAcceptingOrders !== saved.isAcceptingOrders ||
    draft.isAutoAccepting !== saved.isAutoAccepting ||
    draft.prepTimeMinutes !== saved.prepTimeMinutes;

  const reset = () =>
    setDraft({
      isAcceptingOrders: saved.isAcceptingOrders,
      isAutoAccepting: saved.isAutoAccepting,
      prepTimeMinutes: saved.prepTimeMinutes,
    });

  return (
    <Surface>
      <Section title="Service">
        <View style={{ gap: space[4] }}>
          <SwitchRow
            label="Accepting orders"
            hint="The manual switch, independent of opening hours. Off means closed even mid-service."
            value={draft.isAcceptingOrders}
            onValueChange={(isAcceptingOrders) => setDraft({ ...draft, isAcceptingOrders })}
          />

          <SwitchRow
            label="Auto-accept"
            hint="New orders arrive already confirmed instead of waiting to be accepted."
            value={draft.isAutoAccepting}
            onValueChange={(isAutoAccepting) => setDraft({ ...draft, isAutoAccepting })}
          />

          <FormRow
            label="Prep time"
            hint="Minutes between confirming an order and having it ready. Between 5 and 120."
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
              <Stepper
                label="Prep time in minutes"
                value={draft.prepTimeMinutes}
                onChange={(prepTimeMinutes) => setDraft({ ...draft, prepTimeMinutes })}
                min={5}
                max={120}
              />
              <Text variant="body" tone="muted">
                minutes
              </Text>
            </View>
          </FormRow>
        </View>

        <SaveBar
          dirty={dirty}
          saving={save.isPending}
          onReset={reset}
          onSave={() => save.mutate({ data: draft })}
        />
      </Section>
    </Surface>
  );
}

function OpeningHoursCard({ saved }: { saved: Settings }) {
  const save = useSaveSettings("Opening hours");
  const [draft, setDraft] = useState<OpeningHoursEntry[]>(saved.openingHours);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved.openingHours),
    [draft, saved.openingHours],
  );

  /** Server-side field errors, keyed `openingHours.<day>.<field>`. */
  const fields = toApiError(save.error)?.fields ?? {};

  const setDay = (day: DayOfWeek, next: Partial<OpeningHoursEntry>) =>
    setDraft((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, ...next } : entry)),
    );

  const toggleClosed = (day: DayOfWeek, closed: boolean) =>
    setDay(day, closed ? { opensAt: null, closesAt: null } : { opensAt: "09:00", closesAt: "17:00" });

  return (
    <Surface>
      <Section title="Opening hours">
        <InlineAlert
          tone="info"
          message="One interval per day. Split lunch and dinner service, and hours running past midnight, cannot be represented."
        />

        <View style={{ gap: space[3], marginTop: space[3] }}>
          {DAYS_OF_WEEK.map((day) => {
            const entry = draft.find((hours) => hours.day === day);
            if (!entry) return null;
            const closed = entry.opensAt === null;

            return (
              <View
                key={day}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: space[3] }}
              >
                <Text variant="body" style={{ width: 96, paddingTop: space[2] }}>
                  {dayLabel(day)}
                </Text>

                <View style={{ paddingTop: space[1] }}>
                  <Switch
                    label={`Open on ${dayLabel(day)}`}
                    value={!closed}
                    onValueChange={(open) => toggleClosed(day, !open)}
                  />
                </View>

                {closed ? (
                  <Text variant="body" tone="subtle" style={{ paddingTop: space[2] }}>
                    Closed
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", gap: space[3], flex: 1 }}>
                    <View style={{ width: 120 }}>
                      <FormRow label="Opens" error={fields[`openingHours.${day}.opensAt`]}>
                        <TextInput
                          value={entry.opensAt ?? ""}
                          onChangeText={(opensAt) => setDay(day, { opensAt })}
                          placeholder="09:00"
                          invalid={Boolean(fields[`openingHours.${day}.opensAt`])}
                        />
                      </FormRow>
                    </View>
                    <View style={{ width: 120 }}>
                      <FormRow label="Closes" error={fields[`openingHours.${day}.closesAt`]}>
                        <TextInput
                          value={entry.closesAt ?? ""}
                          onChangeText={(closesAt) => setDay(day, { closesAt })}
                          placeholder="17:00"
                          invalid={Boolean(fields[`openingHours.${day}.closesAt`])}
                        />
                      </FormRow>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <SaveBar
          dirty={dirty}
          saving={save.isPending}
          onReset={() => setDraft(saved.openingHours)}
          onSave={() => save.mutate({ data: { openingHours: draft } })}
        />
      </Section>
    </Surface>
  );
}

/** A switch with its label and hint to the left, the way the form rows read. */
function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space[3] }}>
      <View style={{ flex: 1, gap: space[0.5] }}>
        <Text variant="body">{label}</Text>
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      </View>
      <Switch label={label} value={value} onValueChange={onValueChange} />
    </View>
  );
}
