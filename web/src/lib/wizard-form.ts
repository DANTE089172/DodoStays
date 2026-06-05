// Foundation for wizard step forms. Steps should import everything
// they need from this single module so the boilerplate stays consistent.

import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
export type { UseFormReturn } from "react-hook-form";
export { zodResolver };
export { z };

/**
 * A schema whose parsed output is an object compatible with react-hook-form's
 * `FieldValues`. Wizard steps are always objects, so this is a safe narrowing
 * of the broader `z.ZodType` constraint.
 */
export type WizardSchema<TValues extends FieldValues = FieldValues> = z.ZodType<
  TValues,
  TValues
>;

/**
 * Creates a react-hook-form instance pre-wired with our project defaults:
 *   - zodResolver for schema validation
 *   - mode: "onBlur"            (validate after the user leaves a field)
 *   - reValidateMode: "onChange"(once a field has errored, fix-on-type)
 *   - shouldUnregister: false   (wizard steps unmount but state must persist)
 *
 * @param schema        zod schema describing the step's fields
 * @param defaultValues partial defaults; missing keys fall through to RHF's `undefined`
 * @param options       reserved for future autosave wiring (see Plan 05.3)
 */
export function useWizardForm<TValues extends FieldValues>(
  schema: WizardSchema<TValues>,
  defaultValues: Partial<TValues>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: { autoSaveMs?: number },
): UseFormReturn<TValues, unknown, TValues> {
  return useForm<TValues, unknown, TValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: defaultValues as DefaultValues<TValues>,
  });
}
