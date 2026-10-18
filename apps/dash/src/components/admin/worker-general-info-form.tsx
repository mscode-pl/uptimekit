"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { sileo } from "sileo";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Combobox,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxGroupLabel,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxValue,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/ui/save-bar";
import {
    ALL_REGIONS,
    getRegionInfo,
    isFontAwesomeRegionFlag,
    REGIONS_BY_CONTINENT,
} from "@/lib/regions";
import { orpc } from "@/utils/orpc";

interface WorkerGeneralInfoFormProps {
    worker: {
        id: string;
        name: string;
        location: string;
    };
}

export function WorkerGeneralInfoForm({ worker }: WorkerGeneralInfoFormProps) {
    const [savedName, setSavedName] = useState(worker.name);
    const [savedLocation, setSavedLocation] = useState(worker.location);
    const [name, setName] = useState(worker.name);
    const [selectedLocation, setSelectedLocation] = useState(worker.location);

    const formRef = useRef<HTMLFormElement>(null);
    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        ...orpc.workers.update.mutationOptions(),
        onSuccess: (updatedWorker) => {
            setSavedName(updatedWorker.name);
            setSavedLocation(updatedWorker.location);
            setName(updatedWorker.name);
            setSelectedLocation(updatedWorker.location);
            sileo.success({ title: "Worker updated" });
            queryClient.invalidateQueries({
                queryKey: orpc.workers.list.key(),
            });
            queryClient.invalidateQueries({
                queryKey: orpc.workers.listActive.key(),
            });
            queryClient.invalidateQueries({
                queryKey: orpc.workers.listLocations.key(),
            });
            queryClient.invalidateQueries({
                queryKey: orpc.monitors.list.key(),
            });
            router.refresh();
        },
        onError: (error: Error) => {
            sileo.error({ title: error.message });
        },
    });

    const trimmedName = name.trim();
    const hasChanges =
        trimmedName !== savedName || selectedLocation !== savedLocation;
    const selectedRegion = getRegionInfo(selectedLocation);
    const hasKnownSelectedLocation = ALL_REGIONS.some(
        (region) => region.value === selectedLocation,
    );

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!trimmedName) {
            sileo.error({ title: "Name is required" });
            return;
        }

        if (!selectedLocation) {
            sileo.error({ title: "Location is required" });
            return;
        }

        mutate({
            id: worker.id,
            name: trimmedName,
            location: selectedLocation,
        });
    };

    const resetForm = () => {
        setName(savedName);
        setSelectedLocation(savedLocation);
    };

    return (
        <Card>
            <form ref={formRef} onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>General Information</CardTitle>
                    <CardDescription>Update worker details.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Field>
                        <FieldLabel htmlFor="worker-name">Name</FieldLabel>
                        <Input
                            id="worker-name"
                            name="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={isPending}
                            required
                            type="text"
                        />
                        <FieldDescription>
                            This label is used throughout worker lists and
                            monitor views.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="worker-location">
                            Location
                        </FieldLabel>
                        <Combobox
                            items={
                                hasKnownSelectedLocation
                                    ? ALL_REGIONS
                                    : [selectedRegion, ...ALL_REGIONS]
                            }
                            value={selectedRegion}
                            onValueChange={(value) => {
                                if (value) {
                                    setSelectedLocation(value.value);
                                }
                            }}
                            searchParamKey="worker-location"
                            disabled={isPending}
                        >
                            <ComboboxValue>
                                {(
                                    _value: (typeof ALL_REGIONS)[number] | null,
                                ) => (
                                    <ComboboxInput
                                        id="worker-location"
                                        placeholder="Select a region"
                                        className="w-full"
                                    />
                                )}
                            </ComboboxValue>
                            <ComboboxPopup>
                                <ComboboxEmpty>No regions found.</ComboboxEmpty>
                                <ComboboxList className="max-h-[400px]">
                                    {!hasKnownSelectedLocation && (
                                        <ComboboxGroup>
                                            <ComboboxGroupLabel>
                                                Current
                                            </ComboboxGroupLabel>
                                            <ComboboxItem
                                                value={selectedRegion}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isFontAwesomeRegionFlag(
                                                        selectedRegion.Flag,
                                                    ) ? (
                                                        <FontAwesomeIcon
                                                            icon={
                                                                selectedRegion.Flag
                                                            }
                                                            className="size-4 shrink-0 rounded-sm"
                                                        />
                                                    ) : (
                                                        <selectedRegion.Flag className="size-4 shrink-0 rounded-sm" />
                                                    )}
                                                    <span>
                                                        {selectedRegion.label}
                                                    </span>
                                                </div>
                                            </ComboboxItem>
                                        </ComboboxGroup>
                                    )}
                                    {REGIONS_BY_CONTINENT.map((group) => (
                                        <ComboboxGroup key={group.continent}>
                                            <ComboboxGroupLabel>
                                                {group.continent}
                                            </ComboboxGroupLabel>
                                            {group.regions.map((region) => {
                                                const Flag = region.Flag;

                                                return (
                                                    <ComboboxItem
                                                        key={region.value}
                                                        value={region}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {isFontAwesomeRegionFlag(
                                                                Flag,
                                                            ) ? (
                                                                <FontAwesomeIcon
                                                                    icon={Flag}
                                                                    className="size-4 shrink-0 rounded-sm"
                                                                />
                                                            ) : (
                                                                <Flag className="size-4 shrink-0 rounded-sm" />
                                                            )}
                                                            <span>
                                                                {region.label}
                                                            </span>
                                                        </div>
                                                    </ComboboxItem>
                                                );
                                            })}
                                        </ComboboxGroup>
                                    ))}
                                </ComboboxList>
                            </ComboboxPopup>
                        </Combobox>
                        <FieldDescription>
                            Assigned monitors will use the worker's new location
                            after saving.
                        </FieldDescription>
                    </Field>
                </CardContent>
                <SaveBar
                    visible={hasChanges}
                    isPending={isPending}
                    onSave={() => formRef.current?.requestSubmit()}
                    onDiscard={resetForm}
                    className="mx-6 mb-4"
                />
            </form>
        </Card>
    );
}
